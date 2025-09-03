/**
 * Model context limits and token management
 */

export interface ModelLimits {
  contextWindow: number;
  maxOutputTokens?: number;
  inputCostPer1k?: number;
  outputCostPer1k?: number;
}

/**
 * Default context limits for known models
 * This serves as fallback when limits are not specified in config
 */
export const DEFAULT_MODEL_LIMITS: Record<string, ModelLimits> = {
  // OpenAI GPT-4 family
  'gpt-4': { contextWindow: 8192, maxOutputTokens: 4096 },
  'gpt-4-turbo': { contextWindow: 128000, maxOutputTokens: 4096 },
  'gpt-4-turbo-preview': { contextWindow: 128000, maxOutputTokens: 4096 },
  'gpt-4o': { contextWindow: 128000, maxOutputTokens: 16384 },
  'gpt-4o-mini': { contextWindow: 128000, maxOutputTokens: 16384 },
  'gpt-4-32k': { contextWindow: 32768, maxOutputTokens: 4096 },
  
  // OpenAI GPT-3.5 family  
  'gpt-3.5-turbo': { contextWindow: 16385, maxOutputTokens: 4096 },
  'gpt-3.5-turbo-16k': { contextWindow: 16385, maxOutputTokens: 4096 },
  
  // Anthropic Claude family
  'claude-3-haiku': { contextWindow: 200000, maxOutputTokens: 4096 },
  'claude-3-sonnet': { contextWindow: 200000, maxOutputTokens: 4096 },
  'claude-3-opus': { contextWindow: 200000, maxOutputTokens: 4096 },
  'claude-3-5-sonnet': { contextWindow: 200000, maxOutputTokens: 8192 },
  'claude-3-5-haiku': { contextWindow: 200000, maxOutputTokens: 8192 },
  
  // Google Gemini family
  'gemini-pro': { contextWindow: 32760, maxOutputTokens: 8192 },
  'gemini-1.5-pro': { contextWindow: 2097152, maxOutputTokens: 8192 },
  'gemini-1.5-flash': { contextWindow: 1048576, maxOutputTokens: 8192 },
  
  // Meta Llama family (common configurations)
  'llama-2-7b': { contextWindow: 4096, maxOutputTokens: 2048 },
  'llama-2-13b': { contextWindow: 4096, maxOutputTokens: 2048 },
  'llama-2-70b': { contextWindow: 4096, maxOutputTokens: 2048 },
  'llama-3-8b': { contextWindow: 8192, maxOutputTokens: 4096 },
  'llama-3-70b': { contextWindow: 8192, maxOutputTokens: 4096 },
  'llama-3.1-8b': { contextWindow: 131072, maxOutputTokens: 4096 },
  'llama-3.1-70b': { contextWindow: 131072, maxOutputTokens: 4096 },
  'llama-3.1-405b': { contextWindow: 131072, maxOutputTokens: 4096 },
  
  // Mistral family
  'mistral-7b': { contextWindow: 8192, maxOutputTokens: 4096 },
  'mistral-8x7b': { contextWindow: 32768, maxOutputTokens: 4096 },
  'mistral-medium': { contextWindow: 32768, maxOutputTokens: 4096 },
  'mistral-large': { contextWindow: 32768, maxOutputTokens: 4096 },
  
  // Cohere family
  'command': { contextWindow: 4096, maxOutputTokens: 4096 },
  'command-nightly': { contextWindow: 4096, maxOutputTokens: 4096 },
  'command-r': { contextWindow: 128000, maxOutputTokens: 4096 },
  'command-r-plus': { contextWindow: 128000, maxOutputTokens: 4096 },
  
  // DeepSeek family
  'deepseek-chat': { contextWindow: 32768, maxOutputTokens: 4096 },
  'deepseek-coder': { contextWindow: 16384, maxOutputTokens: 4096 },
  'deepseek-chat-v3': { contextWindow: 64000, maxOutputTokens: 8192 },
  'deepseek-chat-v3-0324': { contextWindow: 64000, maxOutputTokens: 8192 },
  
  // Local/Open source models (common defaults)
  'vicuna-7b': { contextWindow: 2048, maxOutputTokens: 1024 },
  'vicuna-13b': { contextWindow: 2048, maxOutputTokens: 1024 },
  'alpaca-7b': { contextWindow: 2048, maxOutputTokens: 1024 },
  'wizardlm-7b': { contextWindow: 2048, maxOutputTokens: 1024 },
  'wizardlm-13b': { contextWindow: 2048, maxOutputTokens: 1024 },
};

/**
 * Get model limits from config or defaults
 * @param modelName The model name
 * @param configLimits Optional limits from model config
 * @returns Model limits object
 */
export const getModelLimits = (
  modelName: string, 
  configLimits?: Partial<ModelLimits>
): ModelLimits => {
  // Start with config overrides
  const limits: ModelLimits = {
    contextWindow: configLimits?.contextWindow || 0,
    maxOutputTokens: configLimits?.maxOutputTokens,
    inputCostPer1k: configLimits?.inputCostPer1k,
    outputCostPer1k: configLimits?.outputCostPer1k,
  };
  
  // If context window not set in config, try to find default
  if (!limits.contextWindow) {
    const defaultLimits = findModelLimits(modelName);
    if (defaultLimits) {
      limits.contextWindow = defaultLimits.contextWindow;
      limits.maxOutputTokens = limits.maxOutputTokens || defaultLimits.maxOutputTokens;
    } else {
      // Fallback for unknown models
      limits.contextWindow = 4096;
      limits.maxOutputTokens = limits.maxOutputTokens || 2048;
    }
  }
  
  return limits;
};

/**
 * Find model limits by exact or partial match
 * @param modelName The model name to search for
 * @returns Model limits if found, null otherwise
 */
export const findModelLimits = (modelName: string): ModelLimits | null => {
  const normalizedName = modelName.toLowerCase();
  
  // Try exact match first
  if (DEFAULT_MODEL_LIMITS[normalizedName]) {
    return DEFAULT_MODEL_LIMITS[normalizedName];
  }
  
  // Try partial matches - check if pattern is found in the model name
  for (const [pattern, limits] of Object.entries(DEFAULT_MODEL_LIMITS)) {
    if (normalizedName.includes(pattern)) {
      return limits;
    }
  }
  
  return null;
};

/**
 * Calculate safe input token budget
 * Reserve tokens for response and system overhead
 * @param contextWindow Total context window size
 * @param maxOutputTokens Maximum output tokens
 * @param reserveTokens Additional tokens to reserve (default: 100)
 * @returns Available input token budget
 */
export const calculateInputBudget = (
  contextWindow: number,
  maxOutputTokens: number = 4096,
  reserveTokens: number = 100
): number => {
  // Cap maxOutputTokens to at most 50% of context window for small contexts
  const cappedOutputTokens = Math.min(maxOutputTokens, Math.floor(contextWindow * 0.5));
  const cappedReserveTokens = Math.min(reserveTokens, Math.floor(contextWindow * 0.1));
  
  const budget = contextWindow - cappedOutputTokens - cappedReserveTokens;
  return Math.max(budget, Math.floor(contextWindow * 0.1)); // At least 10% of context
};

/**
 * Check if model supports function calling
 * @param modelName The model name
 * @returns True if model supports function calling
 */
export const supportsFunctionCalling = (modelName: string): boolean => {
  const functionCallingModels = [
    'gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-3.5-turbo',
    'claude-3', 'gemini-pro', 'gemini-1.5-pro'
  ];
  
  const normalizedName = modelName.toLowerCase();
  return functionCallingModels.some(pattern => normalizedName.includes(pattern));
};