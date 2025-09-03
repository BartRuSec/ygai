import { ModelConfig } from '../config/schema';
import logger from '../utils/logger';
import { getChatModelClassName} from './provider-mapping';
import { enhanceModelConfig } from '../config/enhancers';
import { isProviderInstalled, installProviderPackage, loadPackage } from './provider-manager';

/**
 * Creates a model provider instance using LangChain's ChatPromptTemplate
 * @param module The dynamically loaded module
 * @param config The model configuration
 * @returns The model provider instance
 */
export const createLangChainProvider = async (
  module: any,
  config: ModelConfig
): Promise<any> => {
  // Find the appropriate chat model class
  const className=getChatModelClassName(config.provider);
  const ModelClass = findLangchainClass(module, config.provider, className);
  if (!ModelClass) {
    throw new Error(`Could not find a suitable chat model class in provider module ${config.provider}`);
  }
  
  // Create an instance of the chat model with enhanced config
  logger.debug(`Creating model with provider: ${config.provider}`);
  const enhancedConfig = await enhanceModelConfig(config);
  logger.debug(`Enhanced config ${JSON.stringify(enhancedConfig)}`)
  const model = new ModelClass(enhancedConfig);
  
  return model;
};

/**
 * Finds a suitable chat model class in a module
 * @param module The module to search
 * @param provider The provider package name
 * @returns The chat model class or undefined if not found
 */
export const findLangchainClass = (module: any, _provider: string, expectedClassName:string): any => {
  // Try to get the class name from our mapping
  
  // If we have a mapping for this provider, try to use it first
  if (expectedClassName && module[expectedClassName] && typeof module[expectedClassName] === 'function') {
    return module[expectedClassName];
  }
  
  // If the specific class wasn't found or we don't have a mapping, look for any exported class
  for (const key in module) {
    const exportedItem = module[key];
    
    // Check if it's a class that extends BaseChatModel or has common methods
    if (
      typeof exportedItem === 'function' &&
      (
        (exportedItem.prototype.invoke && typeof exportedItem.prototype.invoke === 'function') ||
        (exportedItem.prototype.generate && typeof exportedItem.prototype.generate === 'function') ||
        (exportedItem.prototype.stream && typeof exportedItem.prototype.stream === 'function') ||
        (exportedItem.prototype._generate && typeof exportedItem.prototype._generate === 'function')
      )
    ) {
      return exportedItem;
    }
  }
  
  // If still not found, check if the default export is a class
  if (module.default && typeof module.default === 'function') {
    return module.default;
  }
  
  return undefined;
};

/**
 * Loads a model based on the configuration
 * @param config The model configuration
 * @returns The model instance
 */
export const loadModel = async (config: ModelConfig): Promise<any> => {
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
