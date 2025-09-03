/**
 * Initialization Node - Simple workflow setup (config already resolved)
 */

import { WorkflowState, WorkflowRuntimeConfig, LangGraphNode } from '../types';
import { updateLoadingStage } from '../../ui';
import logger from '../../utils/logger';

/**
 * Creates the initialization node - minimal setup since config is pre-resolved
 */
export const createInitializationNode = (): LangGraphNode => {
  return async (
    state: WorkflowState, 
    config: { configurable: WorkflowRuntimeConfig }
  ): Promise<Partial<WorkflowState>> => {
    try {
      const { executionConfig, transientData } = config.configurable;
      const {messages} =state;
      // Mark current node for selective checkpointing
      transientData.currentNodeName = 'initialization';
      
      updateLoadingStage('Setting up workflow...');
      
      logger.debug('Workflow initialized:', {
        workflowId: transientData.workflowId,
        model: executionConfig.model.model,
        hasFiles: executionConfig.filesToProcess.length > 0,
        enableHistory: executionConfig.enableHistory
      });
      
      // Initialize user_input variable in transient data for template substitution
      if (!transientData.variables.user_input) {
        transientData.variables.user_input = executionConfig.initialVariables.user_input || '';
      }
      
      // Nothing to persist - everything is in transient data
      return {};
    } catch (error) {
      logger.debug('Initialization failed:', error);
      
      // Stop workflow execution by throwing the error
      throw error;
    }
  };
};