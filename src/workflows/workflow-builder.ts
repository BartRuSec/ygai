/**
 * Workflow Builder - Dynamic workflow construction based on configuration
 */

import { StateGraph } from '@langchain/langgraph';
import { Annotation } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';
import { ExecutionConfig, WorkflowState } from './types';
import { HookConfig } from '../config/schema';
import { 
  createInitializationNode,
  createFileProcessingNode,
  createContextWindowNode,
  createHookNode,
  createStandardLLMNode,
  createMcpLLMNode,
  createOutputNode
} from './nodes';
import logger from '../utils/logger';

/**
 * Builds a conversation workflow graph dynamically based on configuration
 * Flow: Initialization → File Processing → Pre-Hooks → Context Window → [Standard LLM OR MCP LLM] → Post-Hooks → Output
 */
// Define the state annotation to exactly match our WorkflowState interface
const WorkflowStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>,
  stream: Annotation<AsyncGenerator<BaseMessage> | undefined>
});
export const buildConversationWorkflow = (executionConfig: ExecutionConfig) => {
  // Create workflow graph with state annotation
  const workflow = new StateGraph(WorkflowStateAnnotation) as any;
  
  // Add initialization node (always first)
  workflow.addNode('initialization', createInitializationNode());
  
  // Add file processing node (always present, but may process 0 files)
  workflow.addNode('file_processing', createFileProcessingNode());
  
  // Add pre-hooks dynamically based on resolved configuration
  const preHooks = executionConfig.preHooks;
  preHooks.forEach((hookConfig: HookConfig, index: number) => {
    const nodeName = `pre_hook_${index}`;
    workflow.addNode(nodeName, createHookNode(hookConfig));
    logger.debug(`Added pre-hook node: ${nodeName} (${hookConfig.file}:${hookConfig.function})`);
  });
  
  // Add context window node (trims history before LLM)
  workflow.addNode('context_window', createContextWindowNode());
  
  
  // Add LLM node (conditional routing based on MCP configuration)
  const hasMcpServers = Object.keys(executionConfig.mcpServerConfigs).length > 0;
  
  if (hasMcpServers) {
    workflow.addNode('mcp_llm', createMcpLLMNode());
    logger.debug('Added MCP LLM node (MCP servers configured)');
  } else {
    workflow.addNode('standard_llm', createStandardLLMNode());
    logger.debug('Added Standard LLM node (no MCP servers)');
  }
  
  
  // Add post-hooks dynamically based on resolved configuration
  const postHooks = executionConfig.postHooks;
  postHooks.forEach((hookConfig: HookConfig, index: number) => {
    const nodeName = `post_hook_${index}`;
    workflow.addNode(nodeName, createHookNode(hookConfig));
    logger.debug(`Added post-hook node: ${nodeName} (${hookConfig.file}:${hookConfig.function})`);
  });
  
  // Add output node (always last)
  workflow.addNode('output', createOutputNode());
  
  // Define workflow edges
  workflow.addEdge('__start__', 'initialization');
  
  // Linear flow: initialization → file_processing
  workflow.addEdge('initialization', 'file_processing');
  
  // Dynamic pre-hook chain
  let previousNode = 'file_processing';
  preHooks.forEach((_, index) => {
    const nodeName = `pre_hook_${index}`;
    workflow.addEdge(previousNode, nodeName);
    previousNode = nodeName;
  });
  
  // Core processing: last pre-hook (or file_processing) → context_window → [standard_llm OR mcp_llm]
  workflow.addEdge(previousNode, 'context_window');
  
  // Conditional LLM routing
  const llmNodeName = hasMcpServers ? 'mcp_llm' : 'standard_llm';
  workflow.addEdge('context_window', llmNodeName);
  
  // LLM → output (process stream and create AIMessage)
  workflow.addEdge(llmNodeName, 'output');
  
  // Dynamic post-hook chain (after output node has processed the response)
  previousNode = 'output';
  postHooks.forEach((_, index) => {
    const nodeName = `post_hook_${index}`;
    workflow.addEdge(previousNode, nodeName);
    previousNode = nodeName;
  });
  // Final edge: last post-hook (or output if no post-hooks) → __end__
  workflow.addEdge(previousNode, '__end__');
  
  logger.debug('Workflow graph constructed:', {
    preHooks: preHooks.length,
    postHooks: postHooks.length,
    llmType: hasMcpServers ? 'MCP' : 'Standard',
    totalNodes: 5 + preHooks.length + postHooks.length // init + file + context_window + llm + output + hooks
  });
  
  return workflow;
};