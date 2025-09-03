import { HumanMessage } from '@langchain/core/messages';
/**
 * MCP LLM Node - Always non-streaming (MCP agents don't support streaming)
 * Adds complete response messages to state
 */

import { WorkflowState, WorkflowRuntimeConfig, LangGraphNode } from '../types';
import { getModelProvider } from '../../models';
import { prepareLLMMessages } from '../response-helpers';
import { createMcpClient } from '../mcp';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { updateLoadingStage } from '../../ui';
import logger from '../../utils/logger';

export const createMcpLLMNode = (): LangGraphNode => {
  return async (
    state: WorkflowState, 
    config: { configurable: WorkflowRuntimeConfig }
  ): Promise<Partial<WorkflowState>> => {
    try {
      const { executionConfig, transientData } = config.configurable;
      
      transientData.currentNodeName = 'mcp-llm';
      
      // Prepare messages using helper function (includes fileMessages as context)
      const {messages,humanMessage} = await prepareLLMMessages(state.messages || [], config.configurable);
      
      updateLoadingStage('MCP connect...');
      
      // Get base model without MCP integration
      const baseModel = await getModelProvider(executionConfig.model);
      if (!baseModel) {
        throw new Error(`Base model not found`);
      }
      
      // Create MCP client using helper function
      const mcpClient = await createMcpClient(executionConfig.mcpServerConfigs);
      
      // Get tools from MCP servers
      const tools = await mcpClient.getTools();
      logger.debug(`Retrieved ${tools.length} tools from MCP servers`);
      
      if (tools.length === 0) {
        logger.warn('No tools available from MCP servers');
        await mcpClient.close();
        throw new Error('No tools available from MCP servers');
      }
      
      updateLoadingStage('Invoking MCP agent...');
      
      // Create React agent with tools
      const mcpAgent = createReactAgent({
        llm: baseModel,
        tools,
      });
      
      try {
        // MCP agents always use invoke (no streaming support)
        // React agent expects { messages: [...] } format
        const response = await mcpAgent.invoke({ messages });
        
        // Add complete response messages to state stack
        return {
          messages: [...humanMessage,...response.messages]
        };
        
      } finally {
        // Clean up MCP client
        try {
          await mcpClient.close();
        } catch (error) {
          logger.error(`Error cleaning up MCP client: ${error}`);
        }
      }
      
    } catch (error) {
      logger.debug('MCP LLM node failed:', error);
      throw error;
    }
  };
};