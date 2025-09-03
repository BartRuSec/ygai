/**
 * Response processing helper functions for workflow nodes
 * Moved from utils/response-processor.ts to workflows module
 */

import { BaseMessage, HumanMessage } from '@langchain/core/messages';
import { updateTokenCount } from '../ui';
import { createAndFormatChatPrompt } from '../models';
import { WorkflowRuntimeConfig } from './types';
import logger from '../utils/logger';

/**
 * Prepares messages for LLM invocation by combining fileMessages + history + user input
 * fileMessages remain ephemeral (not stored in state), only used for LLM context
 */
export const prepareLLMMessages = async (
  historyMessages: BaseMessage[],
  config: WorkflowRuntimeConfig
): Promise<{ messages: BaseMessage[]; humanMessage: HumanMessage[] }> => {
  const { executionConfig, transientData } = config;
  
  // Get prompt configuration
  const promptConfig = executionConfig.prompt;
  if (!promptConfig) {
    throw new Error('No prompt configuration available');
  }
  
  // Prepare message context: fileMessages (ephemeral) + history (persistent)
  const fileMessages = transientData.fileMessages || [];
  const historyFiltered = historyMessages.filter(msg => msg.getType() !== "system");
  const existingMessages = [...fileMessages, ...historyFiltered];
  
  logger.debug('Preparing LLM messages:', {
    fileMessagesCount: fileMessages.length,
    historyMessagesCount: historyFiltered.length,
    totalExistingMessages: existingMessages.length
  });
  
  // Create formatted chat prompt with fileMessages as context (not stored)
  const llmmsg = await createAndFormatChatPrompt(
    promptConfig.system,
    promptConfig.user,
    transientData.variables,
    existingMessages
  );
  
  if (llmmsg.messages.length === 0) {
    throw new Error('No messages available for LLM invocation');
  }
  
  return llmmsg;
};

/**
 * Extracts text content from various chunk formats
 */
export const extractContentFromChunk = (chunk: any): string => {
  // Handle regular model streaming formats
  if (chunk.content) {
    return chunk.content.toString();
  } else if (chunk.text) {
    return chunk.text.toString();
  } else if (chunk.delta?.content) {
    return chunk.delta.content.toString();
  } else if (typeof chunk === 'string') {
    return chunk;
  }
  return '';
};

/**
 * Processes streaming response and collects content
 */
export const processStreamResponse = async (
  streamResponse: AsyncIterable<any>,
  onTokenUpdate?: (count: number) => void
): Promise<string> => {
  let fullResponse = '';
  let totalTokens = 0;
  
  for await (const chunk of streamResponse) {
    const contentPiece = extractContentFromChunk(chunk);
    
    if (contentPiece) {
      fullResponse += contentPiece;
      totalTokens += 1;
      
      // Update token count in real-time for UI
      if (onTokenUpdate) {
        onTokenUpdate(totalTokens);
      }
    }
  }
  
  return fullResponse;
};

/**
 * Processes any model response (streaming or complete) into a string
 */
export const processModelResponse = async (
  modelResponse: any,
  onTokenUpdate?: (count: number) => void
): Promise<string> => {
  if (typeof modelResponse === 'string') {
    // Complete response (from MCP or non-streaming models)
    return modelResponse;
  } else if (modelResponse[Symbol.asyncIterator]) {
    // Streaming response (from standard models)
    return await processStreamResponse(modelResponse, onTokenUpdate);
  } else if (modelResponse.content) {
    // Handle invoke response with .content property
    return modelResponse.content.toString() || '';
  }
  
  return '';
};