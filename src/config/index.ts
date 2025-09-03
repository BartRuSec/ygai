import path from 'path';
import yaml from 'js-yaml';
import { Config, PromptConfig, validateConfig, ConfigValidationError } from './schema';
import { fileExists, readFile, getConfigPath, getHomeDirectory, resolvePath } from '../utils/file';
import logger from '../utils/logger';

/**
 * Recursively resolves all 'file' properties in a config object to absolute paths (mutates in place)
 * @param obj The object to process (mutated in place)
 * @param configPath The path to the config file (for relative path resolution)
 */
const resolveFilePaths = (obj: any, configPath: string): void => {
  if (!obj || typeof obj !== 'object') {
    return;
  }

  const basePath = path.dirname(configPath);

  if (Array.isArray(obj)) {
    obj.forEach(item => resolveFilePaths(item, configPath));
    return;
  }

  for (const [key, value] of Object.entries(obj)) {
    if (key === 'file' && typeof value === 'string') {
      // Mutate file path to absolute path
      obj[key] = resolvePath(value, basePath);
    } else if (value && typeof value === 'object') {
      // Recursively process nested objects
      resolveFilePaths(value, configPath);
    }
  }
};

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
    const validatedConfig = validateConfig(config);
    
    // Resolve all file paths to absolute paths (mutates config)
    resolveFilePaths(validatedConfig, filePath);
    return validatedConfig;
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
  return modelConfig;
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

