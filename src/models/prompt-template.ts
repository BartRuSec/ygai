
import { SystemMessage, HumanMessage, BaseMessage } from '@langchain/core/messages';
//import { ChatPromptTemplate } from "@langchain/core/prompts";
import { HumanMessagePromptTemplate, SystemMessagePromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import logger from '../utils/logger';
import { FileContext } from '../file-handlers';

// Remove unused import - we now pass existingMessages directly


/**
 * Creates and formats a chat prompt - simplified for LangGraph workflow
 * @param systemPrompt The system prompt template
 * @param userPrompt The user prompt template  
 * @param variables Variables to use for template substitution
 * @param existingMessages Optional array of existing messages (file + history)
 * @returns The formatted messages for LLM
 */


export const createAndFormatChatPrompt = async (
  systemPrompt: string,
  userPrompt: string,
  variables: Record<string, any> = {},
  existingMessages?: BaseMessage[]
): Promise<{ messages: BaseMessage[]; humanMessage: HumanMessage[] }> => {
  try {
    const messages: BaseMessage[] = [];

    logger.debug('createAndFormatChatPrompt inputs:', {
      systemPrompt: typeof systemPrompt,
      userPrompt: typeof userPrompt,
      variables: typeof variables,
      existingMessages: Array.isArray(existingMessages),
      existingMessagesLength: existingMessages?.length
    });

    // Add system message
    const systemMessage = await SystemMessagePromptTemplate.fromTemplate(systemPrompt).invoke(variables);
    logger.debug('systemMessage type:', typeof systemMessage, 'isArray:', Array.isArray(systemMessage));
    messages.push(...systemMessage);
    
    // Add existing messages (file context + conversation history from LangGraph)
    if (existingMessages && existingMessages.length > 0) {
      messages.push(...existingMessages);
    }
  
    // Add current user message  
    let humanMessage:HumanMessage[]=null;
    if (userPrompt) {
      // Use configured user template with variable substitution
      humanMessage= await HumanMessagePromptTemplate.fromTemplate(userPrompt).invoke(variables);
      messages.push(...humanMessage);
    } else if (variables.user_input) {
      // If no user template in config, use CLI user input directly (no templating)
      humanMessage=[new HumanMessage(variables.user_input)]
      messages.push(...humanMessage);
    }

    logger.debug(`Generated ${messages.length} messages for LLM`);
    return {messages, humanMessage} ;
  } catch (error) {
    throw new Error(`Error creating and formatting chat prompt: ${error}`);
  }
};


/**
 * Creates a simple message array with system, context, and human messages
 * @param systemPrompt The system prompt
 * @param userPrompt The user prompt
 * @param contextPrompts Optional array of context prompts to include before the user prompt
 * @returns An array of messages
 */
export const createSimpleMessages = (
  systemPrompt: string,
  userPrompt: string,
  contextPrompts?: string[]
): any[] => {
  const messages = [
    new SystemMessage(systemPrompt),
  ];
  
  // Add context messages if provided
  if (contextPrompts && contextPrompts.length > 0) {
    for (const contextPrompt of contextPrompts) {
      messages.push(new HumanMessage(`CONTEXT: ${contextPrompt}`));
    }
  }
  
  // Add the user prompt
  messages.push(new HumanMessage(userPrompt));
  
  return messages;
};
