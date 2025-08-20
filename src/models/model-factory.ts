import { ModelConfig } from '../config/schema';
import { ModelProvider } from './base';
import logger from '../utils/logger';
import { getChatModelClassName} from './provider-mapping';
import { BaseMessage } from '@langchain/core/messages';
import { enhanceModelConfig, processDynamicClasses } from '../config/enhancers';
import { createSimpleMessages } from './prompt-template';
import { createModuleRegistry } from './provider-manager';
import { createMcpEnabledModel, cleanupMcpModel } from '../mcp';

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
  
  // Create module registry with all available modules
  const moduleRegistry = await createModuleRegistry();
  // Add the current provider module to the registry
  moduleRegistry.set(config.provider, module);
  
  // Create an instance of the chat model with enhanced config
  logger.debug(`Creating model with provider: ${config.provider}`);
  const enhancedConfig = await enhanceModelConfig(config, moduleRegistry);
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
    ): Promise<string | AsyncGenerator<string, void, unknown>> => {
      try {
        // Create messages using the combined method
        logger.debug(`Generating response with model: ${config.model}`);

        // Use the new combined method to create and format the chat prompt

        logger.debug(`Formatted messages: ${JSON.stringify(messages)}`);
        // For MCP-enabled models, disable streaming as React agent streaming is complex
        // Use non-streaming approach which works reliably
        if (stream && !(finalModel as any)._mcpClient) {
          // Use the correct streaming method based on the model
          const streamingMethod = finalModel.stream;
          
          if (!streamingMethod) {
            throw new Error(`Model does not support streaming`);
          }
          
          const streamingResponse = await streamingMethod.call(finalModel, messages);

          return (async function* () {
            let hasContent = false;
            
            for await (const chunk of streamingResponse) {
              const chunkAny = chunk as any;
              let contentPiece = '';

              // Handle regular model streaming formats
              if (chunkAny.content) {
                contentPiece = chunkAny.content.toString();
              } else if (chunkAny.text) {
                contentPiece = chunkAny.text.toString();
              } else if (chunkAny.delta?.content) {
                contentPiece = chunkAny.delta.content.toString();
              } else if (typeof chunkAny === 'string') {
                contentPiece = chunkAny;
              }

              if (contentPiece) {
                hasContent = true;
                yield contentPiece;
              }
            }

            // Append newline only if there was any content
            if (hasContent) {
              yield '\n';
            }
          })();
        } else {
          // Check if this is a React agent (MCP-enabled model)
          if ((finalModel as any)._mcpClient) {
            // React agent expects { messages: [...] } format
            const response = await finalModel.invoke({ messages });
            // Extract the last message content from the agent response
            const lastMessage = response.messages[response.messages.length - 1];
            return lastMessage.content.toString() + "\n" || '';
          } else {
            // Regular model expects messages array directly
            const response = await finalModel.invoke(messages);
            const responseContent = response.content as any;
            return responseContent?.toString()+"\n" || '';
          }
        }
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
export const findLangchainClass = (module: any, provider: string, expectedClassName:string): any => {
  // Try to get the class name from our mapping
  // const expectedClassName = getChatModelClassName(provider);
  
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
