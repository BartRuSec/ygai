import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { loadConfig } from "../config";
import logger from "../utils/logger";

/**
 * Creates an MCP-enabled model by wrapping the base model with a React agent
 * that has access to MCP tools
 * @param baseModel The base LangChain model
 * @param mcpServerNames Array of MCP server names from configuration
 * @returns MCP-enabled model or original model if no MCP servers configured
 */
export const createMcpEnabledModel = async (baseModel: any, mcpServerNames: string[]): Promise<any> => {
  const config = loadConfig();
  
  if (!config.mcp || mcpServerNames.length === 0) {
    logger.debug('No MCP configuration or server names provided, returning original model');
    return baseModel; // Return original model if no MCP
  }
  
  // Build mcpServers object for MultiServerMCPClient
  const mcpServers: Record<string, any> = {};
  
  mcpServerNames.forEach(serverName => {
    if (config.mcp![serverName]) {
      mcpServers[serverName] = config.mcp![serverName];
      logger.debug(`Added MCP server configuration: ${serverName}`);
    } else {
      logger.warn(`MCP server configuration not found: ${serverName}`);
    }
  });
  
  if (Object.keys(mcpServers).length === 0) {
    logger.warn('No valid MCP server configurations found, returning original model');
    return baseModel; // Return original model if no valid MCP servers
  }
  
  try {
    logger.debug(`Creating MCP client with servers: ${Object.keys(mcpServers).join(', ')}`);
    
    // Create MCP client
    const mcpClient = new MultiServerMCPClient({
      throwOnLoadError: true,
      prefixToolNameWithServerName: false,
      useStandardContentBlocks: true,
      mcpServers
    });
    
    // Get tools from MCP servers
    const tools = await mcpClient.getTools();
    logger.debug(`Retrieved ${tools.length} tools from MCP servers`);
    
    if (tools.length === 0) {
      logger.warn('No tools available from MCP servers, returning original model');
      await mcpClient.close();
      return baseModel;
    }
    
    // Create React agent with tools
    const agentModel = createReactAgent({
      llm: baseModel,
      tools,
    });
    
    // Store MCP client for cleanup
    (agentModel as any)._mcpClient = mcpClient;
    
    logger.debug('Successfully created MCP-enabled model with React agent');
    return agentModel;
    
  } catch (error) {
    logger.error(`Error creating MCP-enabled model: ${error}`);
    // Return original model on error to ensure functionality continues
    return baseModel;
  }
};

/**
 * Cleans up MCP resources for a model
 * @param model The model that may have MCP resources
 */
export const cleanupMcpModel = async (model: any): Promise<void> => {
  if (model._mcpClient) {
    try {
      logger.debug('Cleaning up MCP client');
      await model._mcpClient.close();
    } catch (error) {
      logger.error(`Error cleaning up MCP client: ${error}`);
    }
  }
};
