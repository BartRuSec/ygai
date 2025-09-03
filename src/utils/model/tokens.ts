import { encodingForModel } from 'js-tiktoken';
import logger from '../logger';
import { BaseMessage } from '@langchain/core/messages';

/**
 * Count tokens in text using js-tiktoken
 */
export const countTokens = (text: string, model: string = 'gpt-4'): number => {
  try {
    const encoding = encodingForModel(model as any);
    const tokens = encoding.encode(text);
    // Note: free() is not needed in newer versions of js-tiktoken
    return tokens.length;
  } catch (error) {
    logger.debug(`Failed to get tokenizer for model ${model}, using character estimation`);
    // Fallback to character-based estimation (rough: 4 chars per token)
    return Math.ceil(text.length / 4);
  }
};

/**
 * Count tokens in messages array
 */
export const countMessageTokens = (messages: BaseMessage[], model: string = 'gpt-4'): number => {
  return messages.reduce((total, message) => {
    const content = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
    return total + countTokens(content, model);
  }, 0);
};