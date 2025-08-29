import { BaseMessage } from '@langchain/core/messages';
import logger from './logger';

export interface ResponseProcessorOptions {
  stream: boolean;
  onTokenUpdate?: (count: number) => void;
}

export interface ProcessedResponse {
  content: string | AsyncGenerator<string, void, unknown>;
}

/**
 * Extracts text content from various chunk formats
 */
const extractContentFromChunk = (chunk: any): string => {
  // Handle regular model streaming formats
  if (chunk.content) {
    return chunk.content.toString();
  } else if (chunk.text) {
    return chunk.text.toString();
  } else if (chunk.delta?.content) {
    return chunk.delta.content.toString();
  } else if (typeof chunk === 'string') {
    return chunk;
  }
  return '';
};

/**
 * Processes streaming response from LangChain model
 */
const processStreamingResponse = async function* (
  streamingResponse: AsyncIterable<any>,
  options: ResponseProcessorOptions
): AsyncGenerator<string, void, unknown> {
  let hasContent = false;
  let totalTokens = 0;
  
  for await (const chunk of streamingResponse) {
    const contentPiece = extractContentFromChunk(chunk);
    
    if (contentPiece) {
      hasContent = true;
      yield contentPiece;
      
      // Add token increment for this chunk
      
      totalTokens += 1;
      
      // Update token count (only after first token)
      if (options.onTokenUpdate && totalTokens > 0) {
        options.onTokenUpdate(totalTokens);
      }
    }
  }
  
  // Append newline only if there was any content
  if (hasContent) {
    yield '\n';
  }
};

/**
 * Processes non-streaming response by accumulating all chunks
 */
const processNonStreamingResponse = async (
  streamingResponse: AsyncIterable<any>,
  options: ResponseProcessorOptions
): Promise<string> => {
  let fullResponse = '';
  let hasContent = false;
  let totalTokens = 0;
  
  for await (const chunk of streamingResponse) {
    const contentPiece = extractContentFromChunk(chunk);
    
    if (contentPiece) {
      hasContent = true;
      fullResponse += contentPiece;
      
      // Add token increment for this chunk
      
      totalTokens += 1;
      
      // Update token count in real-time (only after first token)
      if (options.onTokenUpdate && totalTokens > 0) {
        options.onTokenUpdate(totalTokens);
      }
    }
  }
  
  // Add newline if there was content
  if (hasContent) {
    fullResponse += '\n';
  }
  
  return fullResponse;
};

/**
 * Shared helper for processing invoke responses with token counting
 */
const processInvokeResponseWithTokens = (content: string, response: any, options: ResponseProcessorOptions): void => {
  // For non-streaming, we don't need token counting during invoke
  // Token counting is only relevant for streaming mode
};

/**
 * Processes MCP (React agent) response
 */
const processMcpResponse = async (
  model: any,
  messages: BaseMessage[],
  options: ResponseProcessorOptions
): Promise<string> => {
  // React agent expects { messages: [...] } format
  const response = await model.invoke({ messages });
  const lastMessage = response.messages[response.messages.length - 1];
  const content = lastMessage.content.toString() || '';
  
  processInvokeResponseWithTokens(content, response, options);
  return content;
};

/**
 * Processes regular model invoke response
 */
const processInvokeResponse = async (
  model: any,
  messages: BaseMessage[],
  options: ResponseProcessorOptions
): Promise<string> => {
  // Regular model expects messages array directly
  const response = await model.invoke(messages);
  const responseContent = response.content as any;
  const content = responseContent?.toString() || '';
  
  processInvokeResponseWithTokens(content, response, options);
  return content;
};

/**
 * Main response processing function
 */
export const processModelResponse = async (
  model: any,
  messages: BaseMessage[],
  options: ResponseProcessorOptions
): Promise<string | AsyncGenerator<string, void, unknown>> => {
  try {
    logger.debug(`Processing model response - streaming: ${options.stream}`);
    
    // Check if this is a React agent (MCP-enabled model)
    if ((model as any)._mcpClient) {
      // MCP models don't support streaming reliably, always use invoke
      return await processMcpResponse(model, messages, options);
    }
    
    // Check if model supports streaming
    const streamingMethod = model.stream;
    const supportsStreaming = Boolean(streamingMethod);
    
    if (options.stream && supportsStreaming) {
      // Use streaming with token counting
      const streamingResponse = await streamingMethod.call(model, messages);
      return processStreamingResponse(streamingResponse, options);
    } else if (!options.stream && supportsStreaming) {
      // Use streaming internally but accumulate response for non-streaming mode
      const streamingResponse = await streamingMethod.call(model, messages);
      return await processNonStreamingResponse(streamingResponse, options);
    } else {
      // Model doesn't support streaming, use invoke
      return await processInvokeResponse(model, messages, options);
    }
  } catch (error) {
    logger.error(`Error processing model response: ${error}`);
    throw new Error(`Error processing response: ${JSON.stringify(error)}`);
  }
};

