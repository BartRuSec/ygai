import { resolvePath, fileExists, readFile } from '../utils/file';
import { HookConfig } from '../config/schema';
import { HookResult } from './types';
import { WorkflowState, TransientWorkflowData, ExecutionConfig } from '../workflows/types';
import { createSandbox } from './sandbox';
import logger from '../utils/logger';

/**
 * Executes a hook with the given configuration and workflow parameters
 * @param hookConfig The hook configuration
 * @param state Persistent workflow state
 * @param data Transient workflow data
 * @param config Optional execution configuration
 * @returns The hook result with variables to update
 */
export const executeHook = async (
  hookConfig: HookConfig, 
  state: WorkflowState,
  data: TransientWorkflowData,
  config?: ExecutionConfig
): Promise<HookResult> => {
  try {
    // Resolve hook file path using existing utility
    const resolvedPath = resolvePath(hookConfig.file);
    
    // Validate file exists (runtime check, as file might have been moved/deleted since config validation)
    if (!fileExists(hookConfig.file)) {
      throw new Error(`Hook file not found: ${hookConfig.file} (resolved to: ${resolvedPath})`);
    }
    
    // Read hook file content
    const hookCode = readFile(hookConfig.file);
    
    // Execute in sandbox with new parameters
    const result = await createSandbox(hookCode, hookConfig.function, state, data, config, resolvedPath);
    
    logger.debug(`Hook executed successfully: ${hookConfig.file}:${hookConfig.function}`);
    return result;
    
  } catch (error) {
    logger.debug(`Hook execution failed: ${hookConfig.file}:${hookConfig.function} - ${error.message}`);
    throw new Error(`Hook execution failed: ${hookConfig.file}:${hookConfig.function} - ${error.message}`);
  }
};
