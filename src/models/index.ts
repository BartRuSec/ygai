import { ModelConfig } from '../config/schema';
import { ModelProvider } from './base';
import { loadModelProvider } from './model-loader';
import logger from '../utils/logger';

// Export provider manager functions
export * from './provider-manager';

// Export prompt template functions
export * from './prompt-template';

// Export prompt resolver functions
export * from './prompt-resolver';

// Cache for model providers
const modelProviderCache: Record<string, ModelProvider> = {};

/**
 * Gets a model provider instance for the specified configuration
 * @param config The model configuration
 * @param mcpServerNames Optional array of MCP server names to enable
 * @returns The model provider instance
 */
export const getModelProvider = async (config: ModelConfig, mcpServerNames?: string[]): Promise<ModelProvider> => {
  // Load the provider
  logger.debug(`Loading model provider: ${config.provider} (${config.model})`);
  const provider = await loadModelProvider(config, mcpServerNames);
  
  return provider;
};

// No built-in providers - all providers are loaded dynamically

// Export types
export type { ModelProvider } from './base';
