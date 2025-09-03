/**
 * Output Node - Simplified with helper functions
 */

import fs from 'fs';
import { AIMessage } from '@langchain/core/messages';
import { WorkflowState, WorkflowRuntimeConfig, LangGraphNode } from '../types';
import { getOutputFormatting, formatOutput, updateTokenCount, stopLoading } from '../../ui';
import { extractContentFromChunk } from '../response-helpers';
import { OutputFormat } from '../../config/schema';
import logger from '../../utils/logger';
import { log } from 'console';

/**
 * Process stream content
 */
async function processStream(stream: AsyncGenerator<any>, shouldStreamToConsole: boolean): Promise<string> {
  let content = '';
  let tokenCount = 0;
  if (shouldStreamToConsole) stopLoading();
  for await (const chunk of stream) {
    const text = extractContentFromChunk(chunk);
    if (text) {
      content += text;
      if (shouldStreamToConsole) {
        process.stdout.write(text);
      } else {
        tokenCount++;
        updateTokenCount(tokenCount);
      }
    }
  }
  return content;
}

/**
 * Get content from last message
 */
function getLastMessageContent(messages: any[]): string {
  const lastMessage = messages[messages.length - 1];
  return lastMessage?.content?.toString() || '';
}

/**
 * Handle console output
 */
async function handleConsoleOutput(
  content: string, 
  hasStream: boolean, 
  shouldStream: boolean, 
  outputFormat: OutputFormat
): Promise<void> {
  if (hasStream && shouldStream) {
    process.stdout.write("\n")
    return;
  } else if (outputFormat === 'plain') {
    // Plain output
    process.stdout.write(content);
  } else {
    // Formatted output
    const formatting = getOutputFormatting(outputFormat);
    const formattedResponse = await formatOutput(content, formatting.shouldFormatMarkdown);
    process.stdout.write(formattedResponse);
  }
}

/**
 * Handle file output
 */
async function handleFileOutput(
  content: string, 
  shouldWriteToFile: boolean, 
  outputFile?: string
): Promise<void> {
  if (shouldWriteToFile && outputFile) {
    await fs.promises.writeFile(outputFile, content, 'utf8');
    logger.info(`Response written to: ${outputFile}`);
  }
}

export const createOutputNode = (): LangGraphNode => {
  return async (
    state: WorkflowState, 
    config: { configurable: WorkflowRuntimeConfig }
  ): Promise<Partial<WorkflowState>> => {
    try {
      const { executionConfig, transientData } = config.configurable;
      transientData.currentNodeName = 'output';
      let content = '';
      let processedStream = false;
   
      // Process content (stream or existing message)
      if (state.stream) {
        content = await processStream(state.stream, executionConfig.shouldStream);
        processedStream = true;
      } else {
        content = getLastMessageContent(state.messages);
      }
      stopLoading();
      // Handle outputs
      await handleConsoleOutput(content, processedStream, executionConfig.shouldStream, executionConfig.outputFormat);
      await handleFileOutput(content, executionConfig.shouldWriteToFile, executionConfig.outputFile);
      if (executionConfig.outputFormat=="plain") process.stdout.write('\n');
      // Update state if needed (only if stream was processed)
      if (processedStream) {
        const aiMessage = new AIMessage(content);
        return { messages: [...state.messages, aiMessage] };
      }
      
      return {};
      
    } catch (error) {
      stopLoading();
      logger.debug('Output node failed:', error);
      throw error;
    }
  };
};