import { InMemoryChatMessageHistory } from '@langchain/core/chat_history';
import { ModelConfig } from '../config/schema';
import { FileContext } from '../file-handlers';
import { BaseMessage } from '@langchain/core/messages';

/**
 * Base interface for all model providers
 */
export interface ModelProvider {
/**
 * Generates a response from the model
 * @param systemPrompt The system prompt
 * @param userPrompt The user prompt
 * @param variables Variables to use for template substitution
 * @param filesContext Optional array of context prompts to include before the user prompt
 * @param history Optional chat history for conversation context
 * @param stream Whether to stream the response
 * @returns The generated response or a stream of response chunks
 */
generate(
  messages: BaseMessage[],
  stream?: boolean,
  onTokenUpdate?: (count: number) => void,
): Promise<any>;


  /**
   * Cleans up any resources used by the model provider
   */
  cleanup?(): Promise<void>;
}

/**
 * Factory function type for creating model providers
 */
// export type ModelProviderFactory = (config: ModelConfig) => Promise<ModelProvider>;

// /**
//  * Registry of model provider factories
//  */
// export const modelProviderRegistry: Record<string, ModelProviderFactory> = {};

// /**
//  * Registers a model provider factory
//  * @param providerName The name of the provider
//  * @param factory The factory function
//  */
// export const registerModelProvider = (
//   providerName: string,
//   factory: ModelProviderFactory
// ): void => {
//   modelProviderRegistry[providerName] = factory;
// };

// /**
//  * Gets a model provider factory by name
//  * @param providerName The name of the provider
//  * @returns The factory function
//  * @throws Error if the provider is not registered
//  */
// export const getModelProviderFactory = (providerName: string): ModelProviderFactory => {
//   const factory = modelProviderRegistry[providerName];
//   if (!factory) {
//     throw new Error(`Model provider "${providerName}" not registered`);
//   }
//   return factory;
// };
