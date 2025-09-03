/**
 * MCP helper functions for workflow nodes
 */

import { MultiServerMCPClient } from '@langchain/mcp-adapters';

/**
 * Creates and configures an MCP client from server configurations
 * @param mcpServers MCP server configurations from executionConfig
 * @returns Configured MCP client
 */
export const createMcpClient = async (mcpServers: Record<string, any>): Promise<MultiServerMCPClient> => {
  if (Object.keys(mcpServers).length === 0) {
    throw new Error('No MCP server configurations provided');
  }
  
  // Create MCP client
  const mcpClient = new MultiServerMCPClient({
    throwOnLoadError: true,
    prefixToolNameWithServerName: false,
    useStandardContentBlocks: true,
    mcpServers
  });
  
  return mcpClient;
};