import { Command } from 'commander';
import logger from '../utils/logger';
import { CommonOptions, processPromptArgs } from './prompt-params';
import { commonSetup } from './utils';
import { addCommonPromptOptions } from './prompt-options';
import { exec } from 'child_process';
import { executePrompt } from './prompt-execution';
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
        // Common setup
        const config = commonSetup(program, options);
        
        // Check for stdin input
        let stdinContent: string | undefined;
        const stdinBuffer = process.stdin.read();
        if (stdinBuffer) {
          stdinContent = stdinBuffer.toString().trim();
        }
        
        // Process command arguments
        const executeOptions = await processPromptArgs(
          config,
          promptName,
          promptArgs,
          options,
          stdinContent
        );
        
       logger.debug('returning base options',executeOptions);
       await executePrompt(executeOptions)
       process.exit(0);

  
      } catch (error) {
        logger.error(`Error: ${error}`);
        process.exit(1);
      }
    });

  return promptCommand;
};
