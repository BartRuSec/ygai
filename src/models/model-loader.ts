import { ModelConfig } from '../config/schema';
import { ModelProvider } from './base';
import logger from '../utils/logger';
import { isProviderInstalled, installProviderPackage, loadPackage } from './provider-manager';
import { createLangChainProvider } from './model-factory';

/**
 * Dynamically loads a model provider based on the configuration
 * @param config The model configuration
 * @returns The model provider instance
 */
export const loadModelProvider = async (config: ModelConfig): Promise<ModelProvider> => {
  const { provider } = config;

  // Check if the provider is already installed
  const isInstalled = isProviderInstalled(provider);
  if (isInstalled) {
    logger.debug(`Provider "${provider}" is already installed`);
  } else {
    // If not installed, try to install it
    logger.info(`Model provider "${provider}" not found. Attempting to install...`);
    const installSuccess = await installProviderPackage(provider);
    if (!installSuccess) {
      throw new Error(`Failed to install provider "${provider}"`);
    }
    logger.info(`Provider "${provider}" installed successfully`);
  }
  
  // Dynamically load the provider using the plugin manager
  try {
    const providerModule = await loadPackage(provider);
    
    // Create a provider adapter using LangChain's ChatPromptTemplate
    return createLangChainProvider(providerModule, config);
  } catch (error) {
    throw new Error(`Failed to load model provider "${provider}": ${error}`);
  }
};
