import { resolvePath, fileExists, readFile } from '../utils/file';
import { HookConfig } from '../config/schema';
import { HookContext } from './types';
import { createSandbox } from './sandbox';
import logger from '../utils/logger';

/**
 * Executes a hook with the given configuration and context
 * @param hookConfig The hook configuration
 * @param context The hook context
 * @returns The updated context from the hook
 */
export const executeHook = async (hookConfig: HookConfig, context: HookContext): Promise<HookContext> => {
  try {
    // Resolve hook file path using existing utility
    const resolvedPath = resolvePath(hookConfig.file);
    
    // Validate file exists (runtime check, as file might have been moved/deleted since config validation)
    if (!fileExists(hookConfig.file)) {
      throw new Error(`Hook file not found: ${hookConfig.file} (resolved to: ${resolvedPath})`);
    }
    
    // Read hook file content
    const hookCode = readFile(hookConfig.file);
    
    // Execute in sandbox
    const result = await createSandbox(hookCode, hookConfig.function, context, resolvedPath);
    
    logger.debug(`Hook executed successfully: ${hookConfig.file}:${hookConfig.function}`);
    return result;
    
  } catch (error) {
    logger.error(`Hook execution failed: ${hookConfig.file}:${hookConfig.function} - ${error.message}`);
    throw new Error(`Hook execution failed: ${error.message}`);
  }
};
