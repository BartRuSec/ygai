import { ModelConfig } from '../config/schema';
import { ModelProvider } from './base';
import logger from '../utils/logger';
import { getChatModelClassName} from './provider-mapping';
import { BaseMessage } from '@langchain/core/messages';
import { enhanceModelConfig, processDynamicClasses } from '../config/enhancers';
import { createSimpleMessages } from './prompt-template';
import { createMcpEnabledModel, cleanupMcpModel } from '../mcp';
import { processModelResponse } from '../utils/response-processor';

/**
 * Creates a model provider instance using LangChain's ChatPromptTemplate
 * @param module The dynamically loaded module
 * @param config The model configuration
 * @returns The model provider instance
 */
export const createLangChainProvider = async (
  module: any,
  config: ModelConfig,
  mcpServerNames?: string[]
): Promise<ModelProvider> => {
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
  
  // MCP Integration: Create MCP-enabled model if MCP servers are specified
  const finalModel = mcpServerNames 
    ? await createMcpEnabledModel(model, mcpServerNames)
    : model;
  
  // Create and return a provider adapter
  return {
    generate: async (
       messages: BaseMessage[],
       stream?: boolean,
       onTokenUpdate?: (count: number) => void,
    ): Promise<string | AsyncGenerator<string, void, unknown>> => {
      try {
        logger.debug(`Generating response with model: ${config.model}`);
        logger.debug(`Formatted messages: ${JSON.stringify(messages)}`);
        
        // Delegate response processing to utility
        return await processModelResponse(finalModel, messages, {
          stream: stream || false,
          onTokenUpdate
        });
      } catch (error) {
        throw new Error(`Error generating response: ${JSON.stringify(error)}`);
      }
    },


    cleanup: async (): Promise<void> => {
      await cleanupMcpModel(finalModel);
    },
  };
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
