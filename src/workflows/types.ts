/**
 * Types for the LangGraph workflow system
 */

import { BaseMessage } from '@langchain/core/messages';
import { Annotation } from '@langchain/langgraph';
import { Config, ModelConfig, ResolvedPromptConfig, HookConfig, OutputFormat } from '../config/schema';
import { FileContext } from '../file-handlers';

/**
 * Raw CLI input - exactly what user provided via Commander.js
 */
export interface CliInput {
  model?: string;
  promptName?: string;
  files?: string[];
  variables?: Record<string, any>;
  userInput?: string;
  stream?: boolean;
  dryRun?: boolean;
  outFile?: string;
  sessionName?: string;
  useGlobal?: boolean;
  systemPrompt?: string;
  plain?: boolean;
  mode?: 'prompt' | 'chat';
}

/**
 * Execution configuration resolved from CLI options and config file
 */
export interface ExecutionConfig {
  model: ModelConfig;
  prompt?: ResolvedPromptConfig;
  outputFormat: OutputFormat;
  enableHistory: boolean;
  sessionName?: string;
  checkpointId?: string;
  shouldStream: boolean;
  shouldWriteToFile: boolean;
  outputFile?: string;
  filesToProcess: string[];
  preHooks: HookConfig[];
  postHooks: HookConfig[];
  mcpServerConfigs: Record<string, any>;
  dryRun: boolean;
  useGlobal: boolean;
  initialVariables: Record<string, any>;
  verbose?: boolean;
}

/**
 * Persistent workflow state - only data that should be saved to database
 * This gets checkpointed by LangGraph's SqliteSaver
 */
export interface WorkflowState {
  // Only conversation messages are persistent
  messages: BaseMessage[];
  // Stream for passing between LLM and output nodes (following LangGraph pattern)
  stream?: AsyncGenerator<any> | undefined;
}

/**
 * Transient workflow data - passed via config, not persisted
 * This data is ephemeral and recreated for each workflow execution
 */
export interface TransientWorkflowData {
  // Message streams (ephemeral)
  fileMessages?: BaseMessage[];
  
  // Mutable workflow variables (can be modified by hooks)
  variables: Record<string, any>;
  
  // Runtime data (enhanced by nodes)
  processedFiles?: FileContext[];
  
  // Workflow metadata
  workflowId: string;
  startTime: Date;
  currentNodeName?: string; // Current executing node name for selective checkpointing
}

/**
 * Runtime configuration for workflow execution
 * Contains transient data passed via LangGraph config parameter
 */
export interface WorkflowRuntimeConfig {
  thread_id: string;
  executionConfig: ExecutionConfig;
  transientData: TransientWorkflowData;
}



/**
 * LangGraph node function type - operates on persistent state + runtime config
 */
export type LangGraphNode = (
  state: WorkflowState, 
  config: { configurable: WorkflowRuntimeConfig }
) => Promise<Partial<WorkflowState>>;

