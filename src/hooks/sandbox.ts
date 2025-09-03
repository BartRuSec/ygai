import * as vm from 'vm';
import * as path from 'path';
import { createRequire } from 'module';
import { HookFunction, HookResult } from './types';
import { WorkflowState, TransientWorkflowData, ExecutionConfig } from '../workflows/types';
import logger from '../utils/logger';

/**
 * Hook execution timeout in milliseconds
 */
const HOOK_TIMEOUT = 5000; // 5 seconds

/**
 * Creates a secure sandbox and executes a hook function
 * @param hookCode The JavaScript code containing the hook function
 * @param functionName The name of the function to execute
 * @param state Persistent workflow state
 * @param data Transient workflow data
 * @param config Optional execution configuration
 * @param hookFilePath The absolute path to the hook file for proper module resolution
 * @returns The hook result with variables to update
 */
export const createSandbox = async (
  hookCode: string,
  functionName: string,
  state: WorkflowState,
  data: TransientWorkflowData,
  config: ExecutionConfig | undefined,
  hookFilePath: string
): Promise<HookResult> => {
  try {
    // Create a custom require function that resolves modules relative to the hook file
    const hookRequire = createRequire(hookFilePath);
    
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
      // Provide require function for external modules (relative to hook file)
      require: hookRequire,
      // Provide module and exports for CommonJS
      module: { exports: {} },
      exports: {},
      // Provide __dirname and __filename relative to hook file
      __dirname: path.dirname(hookFilePath),
      __filename: hookFilePath,
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

    // Create safe copies to prevent external modifications
    // Convert BaseMessages to plain objects that hooks can easily work with
    const stateCopy = {
      messages: state.messages ? state.messages.map(msg => ({
        type: msg.getType(),
        content: msg.content?.toString() || ''
      })) : []
    } as any; // Cast to avoid type issues with simplified message structure
    const dataCopy = JSON.parse(JSON.stringify(data));
    const configCopy = config ? JSON.parse(JSON.stringify(config)) : undefined;

    // Execute the hook function with the new parameters
    logger.debug(`Executing hook function: ${functionName}`);
    const result = await Promise.resolve(hookFunction(stateCopy, dataCopy, configCopy));

    // Validate the result - should be an object of variables to merge
    if (result !== null && result !== undefined && typeof result !== 'object') {
      throw new Error('Hook function must return an object, null, or undefined');
    }

    logger.debug(`Hook function executed successfully: ${functionName}`);
    return result as HookResult;

  } catch (error) {
    if (error.message.includes('Script execution timed out')) {
      throw new Error(`Hook execution timed out after ${HOOK_TIMEOUT}ms`);
    }
    throw new Error(`Hook execution failed: ${error.message}`);
  }
};
