import * as vm from 'vm';
import * as path from 'path';
import { HookContext, HookFunction } from './types';
import logger from '../utils/logger';

/**
 * Hook execution timeout in milliseconds
 */
const HOOK_TIMEOUT = 5000; // 5 seconds

/**
 * Creates a secure sandbox and executes a hook function
 * @param hookCode The JavaScript code containing the hook function
 * @param functionName The name of the function to execute
 * @param context The hook context to pass to the function
 * @returns The updated context from the hook function
 */
export const createSandbox = async (
  hookCode: string,
  functionName: string,
  context: HookContext
): Promise<HookContext> => {
  try {
    // Create a sandbox context with limited access
    const sandbox = {
      // Provide safe utilities
      console: {
        log: (...args: any[]) => logger.info(args),
        warn: (...args: any[]) => logger.warn(args),
        error: (...args: any[]) => logger.error(args),
        debug: (...args: any[]) => logger.debug(args),
      },
      // Provide JSON utilities
      JSON,
      // Provide basic JavaScript objects
      Object,
      Array,
      String,
      Number,
      Boolean,
      Date,
      Math,
      RegExp,
      // Error constructors
      Error,
      TypeError,
      ReferenceError,
      SyntaxError,
      // Allow setTimeout/setInterval for async operations
      setTimeout,
      setInterval,
      clearTimeout,
      clearInterval,
      // Allow Promise for async operations
      Promise,
      // Provide require function for external modules
      require: require,
      // Provide module and exports for CommonJS
      module: { exports: {} },
      exports: {},
      // Provide __dirname and __filename
      __dirname: path.dirname(require.resolve('../hooks/sandbox')),
      __filename: __filename,
      // Provide global reference
      global: undefined as any,
      // Provide process for environment access (limited)
      process: {
        env: process.env,
        cwd: process.cwd,
        platform: process.platform,
        version: process.version,
      },
    };

    // Set global reference to sandbox itself
    sandbox.global = sandbox;

    // Create VM context
    const vmContext = vm.createContext(sandbox);

    // Execute the hook code with timeout
    const script = new vm.Script(hookCode);
    const executeWithTimeout = () => {
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Hook execution timed out after ${HOOK_TIMEOUT}ms`));
        }, HOOK_TIMEOUT);

        try {
          script.runInContext(vmContext, { timeout: HOOK_TIMEOUT });
          clearTimeout(timeout);
          resolve();
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      });
    };

    await executeWithTimeout();

    // Get the exported function
    let hookFunction: HookFunction;
    try {
      // Try to get the function from module.exports first
      if (sandbox.module.exports && typeof sandbox.module.exports[functionName] === 'function') {
        hookFunction = sandbox.module.exports[functionName];
      } else if (sandbox.exports && typeof sandbox.exports[functionName] === 'function') {
        hookFunction = sandbox.exports[functionName];
      } else if (typeof sandbox[functionName as keyof typeof sandbox] === 'function') {
        // Try to get the function directly from sandbox
        hookFunction = sandbox[functionName as keyof typeof sandbox] as HookFunction;
      } else {
        throw new Error(`Function "${functionName}" not found in hook code`);
      }
    } catch (error) {
      throw new Error(`Function "${functionName}" not found in hook code`);
    }

    if (typeof hookFunction !== 'function') {
      throw new Error(`"${functionName}" is not a function`);
    }

    // Create a deep copy of the context to prevent external modifications
    const contextCopy = JSON.parse(JSON.stringify(context));

    // Execute the hook function with the context
    logger.debug(`Executing hook function: ${functionName}`);
    const result = await Promise.resolve(hookFunction(contextCopy));

    // Validate the result
    if (!result || typeof result !== 'object') {
      throw new Error('Hook function must return a context object');
    }

    // Ensure required properties are present
    if (!result.variables || typeof result.variables !== 'object') {
      throw new Error('Hook function must return a context with variables object');
    }

    if (typeof result.userInput !== 'string') {
      throw new Error('Hook function must return a context with userInput string');
    }

    if (!result.promptConfig || typeof result.promptConfig !== 'object') {
      throw new Error('Hook function must return a context with promptConfig object');
    }

    if (!result.metadata || typeof result.metadata !== 'object') {
      throw new Error('Hook function must return a context with metadata object');
    }

    logger.debug(`Hook function executed successfully: ${functionName}`);
    return result as HookContext;

  } catch (error) {
    if (error.message.includes('Script execution timed out')) {
      throw new Error(`Hook execution timed out after ${HOOK_TIMEOUT}ms`);
    }
    throw new Error(`Hook execution failed: ${error.message}`);
  }
};
