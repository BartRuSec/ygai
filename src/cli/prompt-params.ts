import { PromptConfig, ModelConfig } from './../config/schema';
import fs from 'fs';
import { getModelConfig, getPromptConfig } from '../config';
import logger, { setVerbose } from '../utils/logger';
import { Config } from '../config/schema';
import { FileContext, readFileAsMarkdown } from '../file-handlers';


export interface CommonOptions {
  model?: string;
  file?: string[];
  stream?: boolean;
  systemPrompt?: string;
  dryRun?: boolean;
}

export interface PromptExecutionOptions {
  promptConfig?: PromptConfig;
  files?: FileContext[];
  stream: boolean;
  dryRun: boolean;
  model: ModelConfig;
  variables?: Record<string, any>;

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
  options: { file?: string[]; stream?: boolean; dryRun?: boolean; model?: string; systemPrompt?: string,define?:any },
  stdinContent?: string
): Promise<PromptExecutionOptions> {
 
  

  
  // Create base options with common properties
  const executionOptions: PromptExecutionOptions = {
    promptConfig:getPromptConfig(config, 'default'),
    stream: options.stream !== false,
    dryRun: options.dryRun || false,
    model: getModelConfig(config, options.model),
    variables: options.define,
    
  };
  
  const promptConfig = getPromptConfig(config, promptName);


  // If promptConfig is valid, use it; otherwise, use default
  const isPromptConfigValid = promptConfig ? true : false;
  if (isPromptConfigValid) {
    executionOptions.promptConfig = promptConfig;
  }
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


  if (executionOptions.promptConfig.user === undefined) { 
    // If no user prompt is defined in the configuration, use the user input
    if (!userInput) {
       
        throw new Error('No user input provided and no user prompt defined in the configuration');
    } else  {
        executionOptions.promptConfig.user = userInput;
    }
  }  else if (executionOptions.promptConfig.user && userInput) {
    executionOptions.variables.user_input = userInput;
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
  


