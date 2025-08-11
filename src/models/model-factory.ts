import { ModelConfig } from '../config/schema';
import { ModelProvider } from './base';
import logger from '../utils/logger';
import { getChatModelClassName } from './provider-mapping';
import { createSimpleMessages } from './prompt-template';
import { BaseMessage } from '@langchain/core/messages';
import https from 'https';

const unsecureAgent=new https.Agent({
  rejectUnauthorized:true
})
const configHttpAgent=obj => {
  if (obj!==undefined)
  return { ...obj, 
     agent: (obj.agent !=undefined && obj.agent === 'usnecure') ? unsecureAgent: obj["agent"] ,
     httpAgent: (obj.httpAgent !=undefined && obj.httpAgent === 'usnecure') ? unsecureAgent: obj["httpAgent"] ,
     httpsAgent: (obj.httpsAgent !=undefined && obj.httpsAgent === 'usnecure') ? unsecureAgent: obj["httpsAgent"] ,
  }
}
  ;
/**
 * Creates a model provider instance using LangChain's ChatPromptTemplate
 * @param module The dynamically loaded module
 * @param config The model configuration
 * @returns The model provider instance
 */
export const createLangChainProvider = async (
  module: any,
  config: ModelConfig
): Promise<ModelProvider> => {
  // Find the appropriate chat model class
  const ModelClass = findChatModelClass(module, config.provider);
  
  if (!ModelClass) {
    throw new Error(`Could not find a suitable chat model class in provider module ${config.provider}`);
  }
  
  

  // Create an instance of the chat model

  const modelParams = {
    ...config,
    modelName: config.model,
    temperature: config.temperature ?? 0.7,
    clientOptions:configHttpAgent(config.clientOptions),
    configuration:configHttpAgent(config.configuration)
  };


  // Add baseUrl/endpoint if provided

  
  const model = new ModelClass(modelParams);
  
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
        if (stream) {
          // Use the correct streaming method based on the model
          const streamingMethod = model.stream;
          
          if (!streamingMethod) {
            throw new Error(`Model does not support streaming`);
          }
          
          const streamingResponse = await streamingMethod.call(model, messages);

          return (async function* () {
            let hasContent = false;
            
            for await (const chunk of streamingResponse) {
              const chunkAny = chunk as any;
              let contentPiece = '';

              // Handle different response formats
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
          const response = await model.invoke(messages);
          const responseContent = response.content as any;
          return responseContent?.toString()+"\n" || '';
        }
      } catch (error) {
        throw new Error(`Error generating response: ${JSON.stringify(error)}`);
      }
    },

    generateTitle: async (conversation: string): Promise<string> => {
      try {
        // Create messages directly without using ChatPromptTemplate
        const messages = createSimpleMessages(
          'Generate a short, descriptive title for this conversation. Respond with only the title, no quotes or additional text.',
          conversation
        );

        const response = await model.invoke(messages);

        const responseContent = response.content;
        return responseContent?.toString() || 'Untitled Conversation';
      } catch (error) {
        logger.error(`Error generating title: ${error}`);
        return 'Untitled Conversation';
      }
    },
  };
};

/**
 * Finds a suitable chat model class in a module
 * @param module The module to search
 * @param provider The provider package name
 * @returns The chat model class or undefined if not found
 */
export const findChatModelClass = (module: any, provider: string): any => {
  // Try to get the class name from our mapping
  const expectedClassName = getChatModelClassName(provider);
  
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
