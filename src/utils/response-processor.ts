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
 * Extracts token count increment from chunk (for summing)
 */
const extractTokenIncrement = (chunk: any): number => {
  // For chunk-based streaming, estimate tokens from content in this chunk
  const content = extractContentFromChunk(chunk);
  return content ? Math.ceil(content.length / 4) : 0;
};

/**
 * Extracts total token count from response metadata (for final responses)
 */
const extractTotalTokenCount = (response: any): number => {
  // Check for usage information in various LangChain formats
  if (response.usage_metadata?.output_tokens) {
    return response.usage_metadata.output_tokens;
  }
  if (response.usage?.completion_tokens) {
    return response.usage.completion_tokens;
  }
  if (response.response_metadata?.usage?.output_tokens) {
    return response.response_metadata.usage.output_tokens;
  }
  if (response.response_metadata?.tokenUsage?.completionTokens) {
    return response.response_metadata.tokenUsage.completionTokens;
  }
  
  return 0; // No metadata available
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
      const tokenIncrement = extractTokenIncrement(chunk);
      totalTokens += tokenIncrement;
      
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
      const tokenIncrement = extractTokenIncrement(chunk);
      totalTokens += tokenIncrement;
      
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
  // Try to get token count from response metadata or estimate from content
  const metadataTokenCount = extractTotalTokenCount(response);
  const estimatedTokenCount = Math.ceil(content.length / 4);
  const tokenCount = metadataTokenCount > 0 ? metadataTokenCount : estimatedTokenCount;
  
  if (options.onTokenUpdate && tokenCount > 0) {
    options.onTokenUpdate(tokenCount);
  }
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
  const content = lastMessage.content.toString() + "\n" || '';
  
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
  const content = responseContent?.toString() + "\n" || '';
  
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

