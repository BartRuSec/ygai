/**
 * Types for the configuration file
 */

// Model provider configuration
export interface ModelConfig {
  url?: string;
  provider: string;
  model: string;
  unsecure?:boolean;//Allow unsecure connection when set. Use with carefull. For tesing local models only
  [key: string]: any; // Additional parameters passed to the provider
}

// Prompt configuration
export interface PromptConfig {
  short?: string; // Short alias for the prompt
  system?: string; // System prompt template
  user?: string; // User prompt template
  max_tokens?: number; // Maximum tokens for the response
}

// Main configuration structure
export interface Config {
  model: {
    default: ModelConfig; // Default model configuration (mandatory)
    [key: string]: ModelConfig; // Named model configurations
  };
  prompts?: {
    default?: PromptConfig; // Default prompt configuration
    [key: string]: PromptConfig | undefined; // Named prompt configurations
  };
}

// Configuration validation errors
export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

/**
 * Validates the configuration object
 * @param config The configuration object to validate
 * @throws ConfigValidationError if the configuration is invalid
 */
export const validateConfig = (config: any): Config => {
  // Check if config is an object
  if (!config || typeof config !== 'object') {
    throw new ConfigValidationError('Configuration must be an object');
  }

  // Check if model configuration exists
  if (!config.model) {
    throw new ConfigValidationError('Missing "model" configuration');
  }

  // Check if default model configuration exists
  if (!config.model.default) {
    throw new ConfigValidationError('Missing default model configuration');
  }

  // Validate default model configuration
  validateModelConfig(config.model.default, 'default');

  // Validate other model configurations
  Object.keys(config.model).forEach((key) => {
    if (key !== 'default') {
      validateModelConfig(config.model[key], key);
    }
  });

  // Validate prompt configurations if they exist
  if (config.prompts) {
    Object.keys(config.prompts).forEach((key) => {
      validatePromptConfig(config.prompts[key], key);
    });
  }

  return config as Config;
};

/**
 * Validates a model configuration
 * @param modelConfig The model configuration to validate
 * @param configName The name of the configuration
 * @throws ConfigValidationError if the configuration is invalid
 */
const validateModelConfig = (modelConfig: any, configName: string): void => {
  if (!modelConfig.provider) {
    throw new ConfigValidationError(`Missing "provider" in model configuration "${configName}"`);
  }

  if (!modelConfig.model) {
    throw new ConfigValidationError(`Missing "model" in model configuration "${configName}"`);
  }
};

/**
 * Validates a prompt configuration
 * @param promptConfig The prompt configuration to validate
 * @param configName The name of the configuration
 * @throws ConfigValidationError if the configuration is invalid
 */
const validatePromptConfig = (promptConfig: any, configName: string): void => {
  // No mandatory fields for prompt configurations
  // Just check if it's an object
  if (!promptConfig || typeof promptConfig !== 'object') {
    throw new ConfigValidationError(`Prompt configuration "${configName}" must be an object`);
  }
};
