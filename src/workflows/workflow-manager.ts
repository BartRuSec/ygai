/**
 * Workflow Manager - Main workflow orchestrator
 * Contains ALL orchestration logic from prompt-execution.ts
 */

import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite';
import Database from 'better-sqlite3';
import { BaseMessage } from '@langchain/core/messages';
import { ExecutionConfig, WorkflowState, TransientWorkflowData, WorkflowRuntimeConfig } from './types';
import { buildConversationWorkflow } from './workflow-builder';
import { generateWorkflowId } from './utils';
import { getConversationsDbPath } from '../utils/file';
import { stopLoading } from '../ui';
import { SelectiveSaver } from './savers';
import logger from '../utils/logger';

export class WorkflowManager {
  
  /**
   * Create and configure checkpointer for conversation history
   */
  private async createCheckpointer(executionConfig: ExecutionConfig): Promise<{ checkpointer?: SelectiveSaver, history: BaseMessage[] }> {
    if (!executionConfig.enableHistory) {
      return { history: [] };
    }
    
    const dbPath = getConversationsDbPath(executionConfig.useGlobal);
    const db = new Database(dbPath);
    const sqliteSaver = new SqliteSaver(db);
    
    // Wrap SqliteSaver with SelectiveSaver to only checkpoint output node
    const checkpointer = new SelectiveSaver(sqliteSaver, {
      checkpointNodes: ['output'], // Output node finalizes conversation state
      verbose: true//executionConfig.verbose || false
    });
    
    // Load existing conversation history
    let history: BaseMessage[] = [];
    try {
      const threadId = executionConfig.sessionName || 'default';
      const checkpoint = await checkpointer.getTuple({ configurable: { thread_id: threadId } });
      if (checkpoint?.checkpoint?.channel_values?.messages && Array.isArray(checkpoint.checkpoint.channel_values.messages)) {
        history = checkpoint.checkpoint.channel_values.messages;
        logger.debug(`Loaded ${history.length} messages from conversation history`);
      }
    } catch (error) {
      logger.debug('No existing conversation history found, starting fresh');
    }
    
    return { checkpointer, history };
  }
  
  /**
   * Create transient workflow data (not persisted)
   */
  private createTransientData(executionConfig: ExecutionConfig): TransientWorkflowData {
    return {
      variables: executionConfig.initialVariables,
      workflowId: generateWorkflowId(),
      startTime: new Date()
    };
  }
  
  /**
   * Create runtime configuration for workflow execution
   */
  private createRuntimeConfig(
    executionConfig: ExecutionConfig, 
    transientData: TransientWorkflowData
  ): WorkflowRuntimeConfig {
    return {
      thread_id: executionConfig.sessionName || 'default',
      executionConfig,
      transientData
    };
  }
  /**
   * Execute workflow with resolved config
   * Config resolution must happen BEFORE calling this method
   */
  async execute(executionConfig: ExecutionConfig): Promise<void> {
    try {
      // Handle dry run mode
      if (executionConfig.dryRun) {
        logger.info('Dry run mode - resolved config:', executionConfig);
        return;
      }
      
      // Setup workflow components
      const { checkpointer, history } = await this.createCheckpointer(executionConfig);
      const transientData = this.createTransientData(executionConfig);
      const runtimeConfig = this.createRuntimeConfig(executionConfig, transientData);
      
      // Create persistent state (only conversation messages)
     const persistentState: WorkflowState = { messages: history };
      
      // Build and compile workflow
      const workflow = buildConversationWorkflow(executionConfig);
      const compiledWorkflow = workflow.compile({ checkpointer });
      
      // Execute workflow
      logger.debug('Starting workflow execution');
      await compiledWorkflow.invoke(
        persistentState,
        { configurable: runtimeConfig }
      );
      
      stopLoading();
      logger.debug('Workflow completed successfully');
      
    } catch (error) {
      stopLoading();
      logger.debug('Workflow execution failed in workflow_manager:', error);
      
      // Re-throw the error so it reaches the CLI
      throw error;
    }
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    // Close SQLite connections
    // Note: SqliteSaver doesn't expose a close method in current version
    // This is a placeholder for future cleanup if needed
    logger.debug('Workflow manager disposed');
  }
}