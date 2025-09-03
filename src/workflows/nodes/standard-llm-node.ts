/**
 * Standard LLM Node - Following LangGraph streaming pattern
 * Returns stream in state for output node consumption
 */

import { AIMessage, BaseMessage } from '@langchain/core/messages';
import { WorkflowState, WorkflowRuntimeConfig, LangGraphNode } from '../types';
import { getModelProvider } from '../../models';
import { prepareLLMMessages } from '../response-helpers';
import { stopLoading, updateLoadingStage } from '../../ui';
import logger from '../../utils/logger';

export const createStandardLLMNode = (): LangGraphNode => {
  return async (
    state: WorkflowState, 
    config: { configurable: WorkflowRuntimeConfig }
  ): Promise<Partial<WorkflowState>> => {
    try {
      const { executionConfig, transientData } = config.configurable;
      
      transientData.currentNodeName = 'standard-llm';
      
      // Prepare messages using helper function (includes fileMessages as context)
      const {messages,humanMessage} = await prepareLLMMessages(state.messages || [], config.configurable);
      
      updateLoadingStage('Invoking model...');
      
      const model = await getModelProvider(executionConfig.model);
      if (!model) {
        throw new Error(`Model not found`);
      }
      
      if (model.stream) {
        // Following example pattern: return stream in state
        const stream = await model.stream(messages);
        return { 
          messages: [ ...state.messages,...humanMessage],
          stream
        };
      } else {
        // Fallback: no stream available, create AIMessage immediately
        const response = await model.invoke(messages);
        
        return { 
          messages: [...state.messages,...humanMessage, response] 
        };
      }
      
    } catch (error) {
      logger.debug('Standard LLM node failed:', error);
      throw error;
    }
  };
};