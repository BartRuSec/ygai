import { Command } from 'commander';
import logger from '../utils/logger';
import { CommonOptions, processPromptArgs } from './prompt-params';
import { commonSetup, readStdin } from './utils';
import { addCommonPromptOptions } from './prompt-options';
import { exec } from 'child_process';
import { executePrompt } from './prompt-execution';
import { startLoading } from '../ui';
//import { createPromptContext } from './prompt-handler';
//import { processFileContext, executeModelRequest } from './execution-flow';

/**
 * Configure the prompt command
 * @param program The Commander program instance
 * @returns The configured command
 */
export const configurePromptCommand = (program: Command): Command => {
   const promptCommand=program
          .command("prompt")
          .alias("p")
          .description("Generate responses using AI models");
  
  addCommonPromptOptions(promptCommand);
  promptCommand
    .action(async (promptName, promptArgs, options: CommonOptions) => {
      try {
        // Start loading indicator first
        startLoading({ message: 'Warming up...', showTokenCount: true });
        
        // Common setup
        const config = commonSetup(program, options);
        const stdin=await readStdin()
        
        // Process command arguments
        const executeOptions = await processPromptArgs(
          config,
          promptName,
          promptArgs,
          options,
          stdin
        );
        
       logger.debug('returning base options',executeOptions);
       await executePrompt(executeOptions)
       process.exit(0);

  
      } catch (error) {
        // Loading indicator will be stopped automatically by logger event
        logger.error(`${error}`);
        process.exit(1);
      }
    });

  return promptCommand;
};
