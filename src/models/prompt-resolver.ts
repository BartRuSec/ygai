import { readFile, fileExists } from '../utils/file';
import { PromptValue } from '../config/schema';
import logger from '../utils/logger';
import path from 'path';
/**
 * Error thrown when prompt resolution fails
 */
export class PromptResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PromptResolutionError';
  }
}

/**
 * Resolves a prompt value to a string, handling both direct strings and file references
 * @param promptValue The prompt value to resolve (string or file reference)
 * @param configPath Optional path to the config file for relative path resolution
 * @returns The resolved prompt string
 * @throws PromptResolutionError if file resolution fails
 */
export const resolvePromptValue = (promptValue: PromptValue | undefined, configPath?: string): string | undefined => {
  if (!promptValue) {
    return undefined;
  }

  // If it's a string, return it directly
  if (typeof promptValue === 'string') {
    return promptValue;
  }

  // If it's a file reference, resolve the file
  if (typeof promptValue === 'object' && promptValue.file) {
    const basePath = configPath ? path.dirname(configPath) : undefined;
    logger.debug(`File base prompt in ${basePath} and file:${promptValue.file}`)
    // Check if file exists first
    if (!fileExists(promptValue.file, basePath)) {
      throw new PromptResolutionError(`Prompt file not found: ${promptValue.file}`);
    }

    try {
      const content = readFile(promptValue.file, basePath);
      logger.debug(`Successfully loaded prompt file: ${promptValue.file} (${content.length} characters)`);
      return content.trim(); // Remove leading/trailing whitespace
    } catch (error) {
      throw new PromptResolutionError(`Failed to read prompt file ${promptValue.file}: ${error.message}`);
    }
  }

  throw new PromptResolutionError('Invalid prompt value format');
};

/**
 * Resolves both system and user prompts from a prompt configuration
 * @param promptConfig The prompt configuration containing system and user prompts
 * @param configPath Optional path to the config file for relative path resolution
 * @returns Object with resolved system and user prompts
 */
export const resolvePrompts = (
  promptConfig: { system?: PromptValue; user?: PromptValue },
  configPath?: string
): { system?: string; user?: string } => {
  try {
    const resolvedSystem = resolvePromptValue(promptConfig.system, configPath);
    const resolvedUser = resolvePromptValue(promptConfig.user, configPath);

    logger.debug('Resolved prompts:', {
      system: resolvedSystem ? `${resolvedSystem.substring(0, 100)}...` : undefined,
      user: resolvedUser ? `${resolvedUser.substring(0, 100)}...` : undefined
    });

    return {
      system: resolvedSystem,
      user: resolvedUser
    };
  } catch (error) {
    if (error instanceof PromptResolutionError) {
      throw error;
    }
    throw new PromptResolutionError(`Failed to resolve prompts: ${error.message}`);
  }
};
