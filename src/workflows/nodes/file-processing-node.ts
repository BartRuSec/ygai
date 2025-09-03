/**
 * File Processing Node - Processes files in parallel and converts to messages
 */

import fs from 'fs';
import { HumanMessage } from '@langchain/core/messages';
import { WorkflowState, WorkflowRuntimeConfig, LangGraphNode } from '../types';
import { FileContext, readFileAsMarkdown } from '../../file-handlers';
import { updateLoadingStage } from '../../ui';
import logger from '../../utils/logger';

/**
 * Process files in parallel
 */
const processFilesInParallel = async (
  filePaths: string[]
): Promise<FileContext[]> => {
  // Process all files in parallel
  const filePromises = filePaths.map(async (filePath): Promise<FileContext> => {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }
    
    logger.debug(`Processing file: ${filePath}`);
    const fileContext = await readFileAsMarkdown(filePath);
    return fileContext;
  });

  return Promise.all(filePromises);
};

/**
 * Generate files context string for LLM (moved from prompt-template.ts)
 */
const generateFilesContextString = (filesContext: FileContext[]): string | null => {
  if (!filesContext || filesContext.length === 0) {
    return null;
  }
  return "CONTEXT:\n " + filesContext.map(file => 
    `File: ${file.filePath}\n`+
    `Content: ${file.content}\n`+
    "END CONTEXT"
  ).join('\n\n---\n\n');
};

/**
 * Creates the file processing node that handles file reading and message conversion
 */
export const createFileProcessingNode = (): LangGraphNode => {
  return async (
    state: WorkflowState, 
    config: { configurable: WorkflowRuntimeConfig }
  ): Promise<Partial<WorkflowState>> => {
    try {
      const { executionConfig, transientData } = config.configurable;
      
      // Mark current node for selective checkpointing
      transientData.currentNodeName = 'file_processing';
      
      // Get files to process from resolved config
      const filePaths = executionConfig.filesToProcess;
      
      if (filePaths.length === 0) {
        logger.debug('No files to process');
        // Update transient data
        transientData.processedFiles = [];
        transientData.fileMessages = [];
        return {}; // No persistent state changes
      }
      
      updateLoadingStage(`Files processing... (${filePaths.length} files)`);
      logger.debug(`Processing ${filePaths.length} files in parallel`);
      
      // Process files in parallel
      const processedFiles = await processFilesInParallel(filePaths);
      
      // Convert files to context message using consistent format
      let fileMessages: HumanMessage[] = [];
      const filesContextString = generateFilesContextString(processedFiles);
      if (filesContextString) {
        fileMessages = [new HumanMessage(filesContextString)];
      }
      
      logger.info(`Processed ${processedFiles.length} files successfully`);
      
      // Update transient data (not persisted)
      transientData.processedFiles = processedFiles;
      transientData.fileMessages = fileMessages;
      
      return {}; // No persistent state changes
    } catch (error) {
      logger.debug('File processing failed in file-processing node:', error);
      
      // Stop workflow execution by throwing the error
      throw error;
    }
  };
};