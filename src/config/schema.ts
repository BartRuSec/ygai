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

// Prompt value can be either a string or a file reference
export type PromptValue = string | { file: string };

// Prompt configuration
export interface PromptConfig {
  alias?: string; // Short alias for the prompt
  system?: PromptValue; // System prompt template or file reference
  user?: PromptValue; // User prompt template or file reference
  max_tokens?: number; // Maximum tokens for the response
}

// Main configuration structure
export interface Config {
  models: {
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
  if (!config.models) {
    throw new ConfigValidationError('Missing "models" configuration');
  }

  // Check if default model configuration exists
  if (!config.models.default) {
    throw new ConfigValidationError('Missing default model configuration');
  }

  // Validate default model configuration
  validateModelConfig(config.models.default, 'default');

  // Validate other model configurations
  Object.keys(config.models).forEach((key) => {
    if (key !== 'default') {
      validateModelConfig(config.models[key], key);
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
 * Validates a prompt value (string or file reference)
 * @param promptValue The prompt value to validate
 * @param fieldName The name of the field being validated
 * @param configName The name of the configuration
 * @throws ConfigValidationError if the prompt value is invalid
 */
const validatePromptValue = (promptValue: any, fieldName: string, configName: string): void => {
  if (promptValue === undefined) {
    return; // Optional field
  }

  if (typeof promptValue === 'string') {
    return; // Valid string prompt
  }

  if (typeof promptValue === 'object' && promptValue !== null) {
    if (typeof promptValue.file === 'string') {
      return; // Valid file reference
    }
    throw new ConfigValidationError(`Invalid file reference in "${fieldName}" of prompt configuration "${configName}": file must be a string`);
  }

  throw new ConfigValidationError(`Invalid "${fieldName}" in prompt configuration "${configName}": must be a string or file reference object`);
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

  // Validate system and user prompt values
  validatePromptValue(promptConfig.system, 'system', configName);
  validatePromptValue(promptConfig.user, 'user', configName);
};
