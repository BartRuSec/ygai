/**
 * Hook Node - Single reusable hook node for pre/post execution
 */

import { WorkflowState, WorkflowRuntimeConfig, LangGraphNode } from '../types';
import { HookConfig } from '../../config/schema';
import { executeHook } from '../../hooks';
import { updateLoadingStage } from '../../ui';
import logger from '../../utils/logger';

/**
 * Creates a hook node for executing individual hooks
 * This node can modify workflow variables during execution
 */
export const createHookNode = (hookConfig: HookConfig): LangGraphNode => {
  return async (
    state: WorkflowState, 
    config: { configurable: WorkflowRuntimeConfig }
  ): Promise<Partial<WorkflowState>> => {
    try {
      const { executionConfig, transientData } = config.configurable;
      
      // Mark current node for selective checkpointing (hook nodes are not checkpointed)
      transientData.currentNodeName = `hook_${hookConfig.function}`;
      
      // Determine if this is a pre-hook or post-hook based on message availability
      const hasResponse = state.messages && state.messages.length > 0 && state.messages[state.messages.length - 1].getType() === 'ai';
      const hookType = hasResponse ? 'Post-hook' : 'Pre-hook';
      updateLoadingStage(`${hookType} execution...`);
      
      logger.debug(`Executing hook: ${hookConfig.file}:${hookConfig.function}`);
      
      // Execute hook with new signature (state, data, config)
      const hookResult = await executeHook(hookConfig, state, transientData, executionConfig);
      
      logger.debug(`Hook completed: ${hookConfig.file}:${hookConfig.function}`);
      
      // Merge returned variables directly into transient data
      if (hookResult && typeof hookResult === 'object') {
        transientData.variables = {
          ...transientData.variables,
          ...hookResult
        };
      }
      
      // No persistent state changes for hooks
      return {};
    } catch (error) {
      logger.debug(`Hook failed: ${hookConfig.file}:${hookConfig.function}`, error);
      
      // Stop workflow execution by throwing the error
      throw error;
    }
  };
};