
import { SystemMessage, HumanMessage, BaseMessage } from '@langchain/core/messages';
//import { ChatPromptTemplate } from "@langchain/core/prompts";
import { HumanMessagePromptTemplate, SystemMessagePromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import logger from '../utils/logger';
import { FileContext } from '../file-handlers';

import { HistoryManager } from '../history';

/**
 * Generates a string representation of file contexts
 * @param filesContext Array of file contexts
 * @returns A formatted string of file contexts or null if no contexts provided
 */
export const generatefilesContextString = (filesContext: FileContext[]): string => {
  if (!filesContext || filesContext.length === 0) {
    return null;
  }
  return "CONTEXT:\n"+filesContext.map(file => `File:${file.filePath}\nContent:\n${file.content}`).join('"\n\n---\n\n"');
};

/**
 * Creates and formats a chat prompt in a single operation
 * @param systemPrompt The system prompt template
 * @param userPrompt The user prompt template
 * @param variables Variables to use for template substitution
 * @param filesContext Optional array of file contexts
 * @returns The formatted messages
 */
export const createAndFormatChatPrompt = async (
  systemPrompt: string,
  userPrompt: string,
  variables: Record<string, any> = {},
  filesContext?: FileContext[],
  history?: HistoryManager
): Promise<{messages:BaseMessage[],historyMessages:BaseMessage[]}>=> {
  // Create messages array
 
  

  const messages:BaseMessage[] = [];
  const historyMessages: BaseMessage[] = [];
  try {

    const systemMessage= await SystemMessagePromptTemplate.fromTemplate(systemPrompt).invoke(variables);
    messages.push(...systemMessage);
    historyMessages.push(...systemMessage);
    if (history) {
      // Get messages from history
      const historyMessages = await history.getMessages();
      historyMessages.forEach(msg=> {
        if (!(msg.getType() === "system")) {
          messages.push(msg);
        }
      })
    };

  // Add file context if provided
    if (filesContext && filesContext.length > 0) { 
      // Generate files context string using the existing function
      const filesContextString = generatefilesContextString(filesContext);
      if (filesContextString) {
        const fileContextMessage = new HumanMessage(filesContextString);
        messages.push(fileContextMessage);
        historyMessages.push(fileContextMessage);
      }
      
    }
  
  const user= await HumanMessagePromptTemplate.fromTemplate(userPrompt).invoke(variables);
  messages.push(...user);
  historyMessages.push(...user);

    logger.debug(`Generated messages: ${JSON.stringify(messages)}`);
    return {messages, historyMessages};
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

