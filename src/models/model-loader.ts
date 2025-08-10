import { ModelConfig } from '../config/schema';
import { ModelProvider } from './base';
import logger from '../utils/logger';
import { isProviderInstalled, installProviderPackage, PROVIDERS_DIR } from './provider-manager';
import { createLangChainProvider } from './model-factory';
import path from 'path';
import { createRequire } from 'module';

/**
 * Dynamically loads a package from the providers directory
 * @param pkgName The name of the package to load
 * @returns The loaded package 
 * */
export async function loadPackage(pkgName: string) {
  const pluginsDir = path.resolve(PROVIDERS_DIR);
  const pluginRequire = createRequire(pluginsDir + '/');
  const resolvedPath = pluginRequire.resolve(pkgName);
  logger.debug(`Provider resolved path:${resolvedPath}`);
  return await import(resolvedPath);
}

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
    if (!installProviderPackage(provider)) {
      throw new Error(`Failed to install provider "${provider}"`);
    }
    logger.info(`Provider "${provider}" installed successfully`);
  }
  
  // Dynamically import the provider
  try {
    let providerModule;
    try {
      // First try the standard import
      
      providerModule = await loadPackage(provider);
      
    } catch (firstError) {
      // If that fails, try the chat_models subpath for langchain providers
      if (provider.startsWith('@langchain/')) {
        try {
          providerModule = await loadPackage(`${provider}/chat_models`);
        } catch (secondError) {
          throw new Error(`Failed to import provider "${provider}" from both root and chat_models paths`);
        }
      } else {
        throw firstError;
      }
    }
    
    // Create a provider adapter using LangChain's ChatPromptTemplate
    return createLangChainProvider(providerModule, config);
  } catch (error) {
    throw new Error(`Failed to load model provider "${provider}": ${error}`);
  }
};
