import { PromptConfig, ModelConfig, ResolvedPromptConfig } from './../config/schema';
import fs from 'fs';
import { getModelConfig, getPromptConfig } from '../config';
import logger, { setVerbose } from '../utils/logger';
import { Config } from '../config/schema';
import { FileContext, readFileAsMarkdown } from '../file-handlers';
import { resolvePrompts, PromptResolutionError } from '../models';


export interface CommonOptions {
  model?: string;
  file?: string[];
  stream?: boolean;
  systemPrompt?: string;
  dryRun?: boolean;
}

export interface PromptExecutionOptions {
  promptConfig?: ResolvedPromptConfig;
  files?: FileContext[];
  stream: boolean;
  dryRun: boolean;
  model: ModelConfig;
  variables?: Record<string, any>;
  userInput?: string; // Add userInput to execution options
  promptName?: string; // Add promptName for hook context
  output: 'plain' | 'markdown'; // Output formatting resolved from config and CLI options
}



/**
 * Process command line arguments to handle flexible positioning of options
 * and support all cases in the promptspec.md
 * @param promptName The initial prompt name argument
 * @param promptArgs The remaining arguments array
 * @param options Command options
 * @param stdinContent Optional stdin content
 * @returns BaseOptions with processed command arguments
 */

const  processFiles = async (files: string[] | undefined): Promise<FileContext[]> => {
  let fileContexts: FileContext[] = [];
  for (const file of files || []) {
    if (!fs.existsSync(file)) {
      throw new Error(`File does not exist: ${file}`);
    } else {
      const content = await readFileAsMarkdown(file);
      fileContexts.push({
        filePath: file,
        content: content.content
      });
    }
  }
  return fileContexts;
}
export async function processPromptArgs(
  config: Config,
  promptName: string | undefined,
  promptArgs: string[],
  options: { file?: string[]; stream?: boolean; dryRun?: boolean; model?: string; systemPrompt?: string; define?: any; plain?: boolean },
  stdinContent?: string
): Promise<PromptExecutionOptions> {
 
  

  
  // Get the appropriate prompt configuration
  let promptConfig = getPromptConfig(config, promptName);
  const isPromptConfigValid = promptConfig ? true : false;
  if (!isPromptConfigValid) promptConfig=getPromptConfig(config, 'default');

  // Validate required variables if specified in prompt config
  if (promptConfig?.vars) {
    const providedVars = Object.keys(options.define || {});
    const missingVars = promptConfig.vars.filter(varName => !providedVars.includes(varName));
    if (missingVars.length > 0) {
      throw new Error(`Missing required variables: ${missingVars.join(', ')}. Use -D<var>=<value> to provide them.`);
    }
  }

  // Resolve file-based prompts and create resolved config
  let resolvedPromptConfig: ResolvedPromptConfig | undefined;
  if (promptConfig) {
    try {
      const resolvedPrompts = resolvePrompts(promptConfig);
      resolvedPromptConfig = {
        alias: promptConfig.alias,
        system: resolvedPrompts.system,
        user: resolvedPrompts.user,
        max_tokens: promptConfig.max_tokens,
        vars: promptConfig.vars,
        pre: promptConfig.pre,
        post: promptConfig.post,
        mcp: promptConfig.mcp,
        output: promptConfig.output
      };
    } catch (error) {
      if (error instanceof PromptResolutionError) {
        throw new Error(`Prompt resolution failed: ${error.message}`);
      }
      throw error;
    }
  }

  // Determine output format with priority: --plain CLI option > prompt config output > default 'markdown'
  let outputFormat: 'plain' | 'markdown' = 'markdown';
  if (options.plain) {
    outputFormat = 'plain';
  } else if (resolvedPromptConfig?.output) {
    outputFormat = resolvedPromptConfig.output;
  }

  // Create base options with common properties
  const executionOptions: PromptExecutionOptions = {
    promptConfig: resolvedPromptConfig,
    stream: options.stream === true, // Default to false, only true if explicitly set
    dryRun: options.dryRun || false,
    model: getModelConfig(config, options.model),
    variables: options.define!==undefined? options.define:{},
    promptName: promptName,
    output: outputFormat,
  };


  // If systemPrompt is provided, override the system prompt in the config
  if (options.systemPrompt) {
    executionOptions.promptConfig.system = options.systemPrompt;
  }
  
  let userInput: string | null= null;
  //determine user input based on the promptConfig and arguments
  if (stdinContent) {
    userInput = stdinContent.trim();
  } else if (isPromptConfigValid && promptArgs.length > 0) {
    userInput = promptArgs.join(' ');
  } else if (!isPromptConfigValid && promptName && promptArgs.length === 0) {
    userInput = promptName
  } else if( !isPromptConfigValid && promptArgs.length > 0) {
    userInput = promptName+promptArgs.join(' ');
  } 

  // Set userInput once in execution options
  executionOptions.userInput = userInput || '';
  
  // Reference the same value in variables (always available, even if empty)
  executionOptions.variables.user_input = executionOptions.userInput;

  if (executionOptions.promptConfig.user === undefined) { 
    // If no user prompt is defined in the configuration, use the user input
    if (!userInput) {
        throw new Error('No user input provided and no user prompt defined in the configuration');
    } else  {
        executionOptions.promptConfig.user = userInput;
    }
  }
  
   if (options.file) {
    executionOptions.files = await processFiles(options.file);
   }
    if (options.dryRun) {
      setVerbose(true);
      logger.info('Execution parameters:', executionOptions);
      process.exit(0)
   }
  
    return executionOptions;
  }
