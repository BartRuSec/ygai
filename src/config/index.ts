import path from 'path';
import yaml from 'js-yaml';
import { Config, PromptConfig, validateConfig, ConfigValidationError } from './schema';
import { fileExists, readFile, getConfigPath, getHomeDirectory } from '../utils/file';
import { resolvePromptValue } from '../models/prompt-resolver';
import { enhanceModelConfig } from './enhancers';
import logger from '../utils/logger';

/**
 * Loads the configuration from the specified file
 * @param filePath Path to the configuration file
 * @returns The loaded configuration or null if the file doesn't exist
 */
const loadConfigFile = (filePath: string): Config | null => {
  try {
    if (!fileExists(filePath)) {
      logger.debug(`Configuration file not found: ${filePath}`);
      return null;
    }

    logger.debug(`Loading configuration from: ${filePath}`);
    const content = readFile(filePath);
    const config = yaml.load(content) as any;
    return validateConfig(config);
  } catch (error) {
    if (error instanceof ConfigValidationError) {
      throw error;
    }
    logger.error(`Error loading configuration from ${filePath}: ${error}`);
    return null;
  }
};

/**
 * Loads the configuration according to the hierarchy:
 * 1. .ygai/config.yaml in the current directory
 * 2. .ygai/config.yaml in the user's home directory
 * @returns The loaded configuration
 * @throws Error if no valid configuration is found
 */
export const loadConfig = (): Config => {
  // Try to load from current directory
  const currentDirConfig = loadConfigFile(getConfigPath(process.cwd()));
  
  // Try to load from home directory
  const homeDirConfig = loadConfigFile(getConfigPath(getHomeDirectory()));

  // Merge configurations (current directory overrides home directory)
  const config = {
    ...(homeDirConfig || {}),
    ...(currentDirConfig || {}),
  } as Config;

  // Validate the merged configuration
  try {
    return validateConfig(config);
  } catch (error) {
    if (error instanceof ConfigValidationError) {
      throw new Error(`Invalid configuration: ${error.message}`);
    }
    throw new Error(`Error loading configuration: ${error}`);
  }
};

/**
 * Gets a model configuration by name
 * @param config The configuration object
 * @param modelName The name of the model configuration to get
 * @returns The enhanced model configuration
 * @throws Error if the model configuration doesn't exist
 */
export const getModelConfig = (config: Config, modelName?: string): Config['models']['default'] => {
  const name = modelName || 'default';
  const modelConfig = config.models[name];
  
  if (!modelConfig) {
    throw new Error(`Model configuration "${name}" not found`);
  }
  
  // Apply all enhancements to the model configuration
  return enhanceModelConfig(modelConfig);
};



export const getPromptConfig = (config: Config, promptName?: string): PromptConfig | undefined => {
  if (!config.prompts) {
    return undefined;
  }

  // if (!promptName) {
  //   return config.prompts.default;
  // }

  // Try to find by name
  const promptConfig = config.prompts[promptName];
  if (promptConfig) {
    return promptConfig;
  } else  {

  
  for (const [name, prompt] of Object.entries(config.prompts)) {
    if (prompt && prompt.alias === promptName) {
      return prompt;
    }
  }
  }

  // Return default if not found
  return null;
};

/**
 * Gets the system prompt for a given prompt configuration and variables
 * @param config The configuration object
 * @param promptName The name of the prompt configuration to use
 * @param variables The variables to use for rendering the prompt
 * @param systemPromptOverride An optional system prompt to override the one from the configuration
 * @returns The rendered system prompt
 */
export const getSystemPrompt = (
  config: Config,
  promptName?: string,
  variables: Record<string, any> = {},
  systemPromptOverride?: string
): string => {
  // Use the override if provided
  if (systemPromptOverride) {
    return systemPromptOverride;
  }
  
  // Get the prompt configuration
  const promptConfig = getPromptConfig(config, promptName);
  
  // Use the system prompt from the configuration if available
  if (promptConfig?.system) {
    const resolvedPrompt = resolvePromptValue(promptConfig.system);
    if (resolvedPrompt) {
      return resolvedPrompt;
    }
  }
  
  // Use a default system prompt if none is provided
  return 'Respond helpfully to the user\'s request based on the provided context.';
};

/**
 * Gets the user prompt for a given prompt configuration and variables
 * @param config The configuration object
 * @param promptName The name of the prompt configuration to use
 * @param userPrompt The user prompt to use
 * @param variables The variables to use for rendering the prompt
 * @returns The rendered user prompt
 */
export const getUserPrompt = (
  config: Config,
  promptName?: string,
  userPrompt?: string,
  variables: Record<string, any> = {}
): string => {
  // Get the prompt configuration
  const promptConfig = getPromptConfig(config, promptName);
  
  // Use the provided user prompt if available
  if (userPrompt) {
    return userPrompt;
  }
  
  // Use the user prompt from the configuration if available
  if (promptConfig?.user) {
    const resolvedPrompt = resolvePromptValue(promptConfig.user);
    if (resolvedPrompt) {
      return resolvedPrompt;
    }
  }
  
  // Return an empty string if no user prompt is provided
  return '';
};
