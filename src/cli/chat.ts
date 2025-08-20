import { Command } from 'commander';
import readline from 'readline';
import { addCommonPromptOptions} from './prompt-options';
//import { createPromptContext } from './prompt-handler';
//import { processFileContext, executeModelRequest } from './execution-flow';

import { processPromptArgs, PromptExecutionOptions, CommonOptions } from './prompt-params';
import { commonSetup, readStdin } from './utils';

import logger from '../utils/logger';
import { executePrompt } from './prompt-execution';

/**
 * Configure the chat command
 * @param program The Commander program instance
 * @returns The configured command
 */
export const configureChatCommand = (program: Command): Command => {
  const chatCommand = program
    .command('chat')
    .alias('c')
    .description("chat mode with conversation history");
    addCommonPromptOptions(chatCommand)

  chatCommand
  //  .option('-i, --interactive', 'Enter interactive mode (continuous conversation until exit)')
    .action(async (promptName, promptArgs, options: CommonOptions & { interactive?: boolean }) => {
      try {
        
           // Common setup
        const config = commonSetup(program, options);
        
        const stdin=await readStdin();
        
        // Process command arguments
        const executeOptions = await processPromptArgs(
          config,
          promptName,
          promptArgs,
          options,
          stdin,

        );
        logger.debug('returning base options',executeOptions);
        await executePrompt(executeOptions,true)
        process.exit(0);
      } catch (error) {
        logger.error(`${error}`);
        process.exit(1);
      }
    });

  return chatCommand;
};
