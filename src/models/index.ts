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
 * @returns The model provider instance
 */
export const getModelProvider = async (config: ModelConfig): Promise<ModelProvider> => {
  const cacheKey = `${config.provider}:${config.models}:${config.url || ''}`;
  
  // Check if the provider is already cached
  if (modelProviderCache[cacheKey]) {
    return modelProviderCache[cacheKey];
  }
  
  // Load the provider
  logger.debug(`Loading model provider: ${config.provider} (${config.models})`);
  const provider = await loadModelProvider(config);
  
  // Cache the provider
  modelProviderCache[cacheKey] = provider;
  
  return provider;
};

// No built-in providers - all providers are loaded dynamically

// Export types
export type { ModelProvider } from './base';
