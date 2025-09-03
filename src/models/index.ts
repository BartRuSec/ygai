import { ModelConfig } from '../config/schema';
import { loadModel } from './model-factory';
import logger from '../utils/logger';

// Export provider manager functions
export * from './provider-manager';

// Export prompt template functions
export * from './prompt-template';

// Export prompt resolver functions
export * from './prompt-resolver';

/**
 * Gets a model provider instance for the specified configuration
 * @param config The model configuration
 * @returns The model provider instance
 */
export const getModelProvider = async (config: ModelConfig): Promise<any> => {
  // Load the provider
  logger.debug(`Loading model provider: ${config.provider} (${config.model})`);
  const provider = await loadModel(config);
  
  return provider;
};

// No built-in providers - all providers are loaded dynamically
