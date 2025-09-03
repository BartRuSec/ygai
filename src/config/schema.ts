/**
 * Types for the configuration file
 */

// Model provider configuration
export interface ModelConfig {
  url?: string;
  provider: string;
  model: string;
  unsecure?:boolean;//Allow unsecure connection when set. Use with carefull. For tesing local models only
  contextWindow?: number; // Override default context window size
  maxOutputTokens?: number; // Override default max output tokens
  [key: string]: any; // Additional parameters passed to the provider
}

// Prompt value can be either a string or a file reference
export type PromptValue = string | { file: string };

// Output format type
export type OutputFormat = 'plain' | 'markdown';

// Hook configuration
export interface HookConfig {
  file: string; // Path to the hook file
  function: string; // Function name to execute
}

// Centralized hook definition (same structure as HookConfig)
export interface HookDefinition {
  file: string; // Path to the hook file
  function: string; // Function name to execute
}

// Hook reference - can be either a hook name (string) or inline HookConfig
export type HookReference = string | HookConfig;

// Prompt configuration
export interface PromptConfig {
  alias?: string; // Short alias for the prompt
  system?: PromptValue; // System prompt template or file reference
  user?: PromptValue; // User prompt template or file reference
  vars?: string[]; // Required variables to be provided via -D option
  pre?: HookReference | HookReference[]; // Pre-execution hook(s) - supports both old format and new arrays
  post?: HookReference | HookReference[]; // Post-execution hook(s) - supports both old format and new arrays
  mcp?: string[] | string; // MCP servers to use for this prompt
  output?: OutputFormat; // Output formatting (default: markdown)
}

// Resolved prompt configuration (with prompt values resolved to strings)
export type ResolvedPromptConfig = Omit<PromptConfig, 'system' | 'user'> & {
  system?: string; // Always resolved to string
  user?: string; // Always resolved to string
  mcp?: string[] | string; // MCP servers to use for this prompt
  output?: OutputFormat; // Output formatting (default: markdown)
};

// MCP server configuration
export interface McpServerConfig {
  // STDIO transport
  transport?: 'stdio' | 'sse';
  command?: string;
  args?: string[];
  restart?: {
    enabled: boolean;
    maxAttempts: number;
    delayMs: number;
  };
  
  // HTTP/SSE transport
  url?: string;
  headers?: Record<string, string>;
  automaticSSEFallback?: boolean;
  reconnect?: {
    enabled: boolean;
    maxAttempts: number;
    delayMs: number;
  };
  
  // Additional options
  [key: string]: any;
}

// Options configuration
export interface OptionsConfig {
  history?: {
    maxSizePerSessionMB?: number; // Maximum size per session in MB (default: 10)
    trimToSizeMB?: number; // Trim to size in MB when max exceeded (default: 8)
  };
}

// Main configuration structure
export interface Config {
  models: {
    default: ModelConfig; // Default model configuration (mandatory)
    [key: string]: ModelConfig; // Named model configurations
  };
  hooks?: {
    [key: string]: HookDefinition; // Named hook definitions
  };
  prompts?: {
    default?: PromptConfig; // Default prompt configuration
    [key: string]: PromptConfig | undefined; // Named prompt configurations
  };
  mcp?: {
    [key: string]: McpServerConfig; // Named MCP server configurations
  };
  options?: OptionsConfig; // Optional configuration
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

  // Validate hooks configurations if they exist
  if (config.hooks) {
    Object.keys(config.hooks).forEach((key) => {
      validateHookDefinition(config.hooks![key], key);
    });
  }

  // Validate prompt configurations if they exist
  if (config.prompts) {
    Object.keys(config.prompts).forEach((key) => {
      validatePromptConfig(config.prompts[key], key, config.hooks);
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
 * Validates a hook definition in the centralized hooks section
 * @param hookDefinition The hook definition to validate
 * @param hookName The name of the hook definition
 * @throws ConfigValidationError if the configuration is invalid
 */
const validateHookDefinition = (hookDefinition: any, hookName: string): void => {
  if (!hookDefinition || typeof hookDefinition !== 'object') {
    throw new ConfigValidationError(`Hook definition "${hookName}" must be an object`);
  }

  if (!hookDefinition.file || typeof hookDefinition.file !== 'string') {
    throw new ConfigValidationError(`Missing or invalid "file" in hook definition "${hookName}"`);
  }

  if (!hookDefinition.function || typeof hookDefinition.function !== 'string') {
    throw new ConfigValidationError(`Missing or invalid "function" in hook definition "${hookName}"`);
  }

  // Validate function name format
  if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(hookDefinition.function)) {
    throw new ConfigValidationError(`Invalid function name "${hookDefinition.function}" in hook definition "${hookName}"`);
  }
};

/**
 * Validates a hook configuration (inline format)
 * @param hookConfig The hook configuration to validate
 * @param hookType The type of hook (pre/post)
 * @param configName The name of the configuration
 * @throws ConfigValidationError if the configuration is invalid
 */
const validateHookConfig = (hookConfig: any, hookType: string, configName: string): void => {
  if (!hookConfig || typeof hookConfig !== 'object') {
    throw new ConfigValidationError(`${hookType} hook configuration in "${configName}" must be an object`);
  }

  if (!hookConfig.file || typeof hookConfig.file !== 'string') {
    throw new ConfigValidationError(`Missing or invalid "file" in ${hookType} hook configuration "${configName}"`);
  }

  if (!hookConfig.function || typeof hookConfig.function !== 'string') {
    throw new ConfigValidationError(`Missing or invalid "function" in ${hookType} hook configuration "${configName}"`);
  }

  // Validate function name format
  if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(hookConfig.function)) {
    throw new ConfigValidationError(`Invalid function name "${hookConfig.function}" in ${hookType} hook configuration "${configName}"`);
  }
};

/**
 * Validates a hook reference (can be string or inline HookConfig)
 * @param hookReference The hook reference to validate
 * @param hookType The type of hook (pre/post)
 * @param configName The name of the configuration
 * @param centralHooks Available central hook definitions
 * @throws ConfigValidationError if the configuration is invalid
 */
const validateHookReference = (
  hookReference: any, 
  hookType: string, 
  configName: string, 
  centralHooks?: { [key: string]: HookDefinition }
): void => {
  if (typeof hookReference === 'string') {
    // Validate hook name reference
    if (!centralHooks || !centralHooks[hookReference]) {
      throw new ConfigValidationError(`Hook reference "${hookReference}" in ${hookType} of prompt "${configName}" not found in hooks section`);
    }
  } else if (typeof hookReference === 'object' && hookReference !== null) {
    // Validate inline hook configuration
    validateHookConfig(hookReference, hookType, configName);
  } else {
    throw new ConfigValidationError(`Invalid ${hookType} hook reference in prompt "${configName}": must be a string (hook name) or object (inline hook config)`);
  }
};

/**
 * Validates a prompt configuration
 * @param promptConfig The prompt configuration to validate
 * @param configName The name of the configuration
 * @param centralHooks Available central hook definitions
 * @throws ConfigValidationError if the configuration is invalid
 */
const validatePromptConfig = (
  promptConfig: any, 
  configName: string, 
  centralHooks?: { [key: string]: HookDefinition }
): void => {
  // No mandatory fields for prompt configurations
  // Just check if it's an object
  if (!promptConfig || typeof promptConfig !== 'object') {
    throw new ConfigValidationError(`Prompt configuration "${configName}" must be an object`);
  }

  // Validate system and user prompt values
  validatePromptValue(promptConfig.system, 'system', configName);
  validatePromptValue(promptConfig.user, 'user', configName);

  // Validate vars array if present
  if (promptConfig.vars !== undefined) {
    if (!Array.isArray(promptConfig.vars)) {
      throw new ConfigValidationError(`"vars" in prompt configuration "${configName}" must be an array`);
    }
    promptConfig.vars.forEach((varName: any, index: number) => {
      if (typeof varName !== 'string') {
        throw new ConfigValidationError(`Variable at index ${index} in prompt configuration "${configName}" must be a string`);
      }
    });
  }

  // Validate hook configurations if present - now supports both formats and arrays
  if (promptConfig.pre !== undefined) {
    if (Array.isArray(promptConfig.pre)) {
      promptConfig.pre.forEach((hookRef: any, index: number) => {
        try {
          validateHookReference(hookRef, 'pre', configName, centralHooks);
        } catch (error) {
          throw new ConfigValidationError(`Error in pre hook at index ${index}: ${(error as Error).message}`);
        }
      });
    } else {
      validateHookReference(promptConfig.pre, 'pre', configName, centralHooks);
    }
  }

  if (promptConfig.post !== undefined) {
    if (Array.isArray(promptConfig.post)) {
      promptConfig.post.forEach((hookRef: any, index: number) => {
        try {
          validateHookReference(hookRef, 'post', configName, centralHooks);
        } catch (error) {
          throw new ConfigValidationError(`Error in post hook at index ${index}: ${(error as Error).message}`);
        }
      });
    } else {
      validateHookReference(promptConfig.post, 'post', configName, centralHooks);
    }
  }

  // Validate output field if present
  if (promptConfig.output !== undefined) {
    if (promptConfig.output !== 'plain' && promptConfig.output !== 'markdown') {
      throw new ConfigValidationError(`"output" in prompt configuration "${configName}" must be either "plain" or "markdown"`);
    }
  }
};
