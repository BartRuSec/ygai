import { Command } from 'commander';
import readline from 'readline';
import { addCommonPromptOptions} from './prompt-options';
//import { createPromptContext } from './prompt-handler';
//import { processFileContext, executeModelRequest } from './execution-flow';

import { processPromptArgs, PromptExecutionOptions, CommonOptions } from './prompt-params';
import { commonSetup } from './utils';

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
          stdinContent,

        );
        logger.debug('returning base options',executeOptions);

        await executePrompt(executeOptions,true)
 
        
        // Common setup
      
        
        // Initialize chat history (original implementation)
       
      //  const historyManager: HistoryManager = HistoryManager.loadHistory();
        
      //   // Process command arguments with new unified handler
      //   const stdinBuffer = process.stdin.read();
      //   const stdinContent = stdinBuffer ? stdinBuffer.toString().trim() : undefined;
        
      //   const baseOpts = processPromptArgs(
      //     promptName,
      //     promptArgs,
      //     options,
      //     stdinContent
      //   );
        
      //   // Create prompt context using BaseOptions
      //   const promptContext = createPromptContext(
      //     config,
      //     baseOpts.promptTemplate,
      //     [baseOpts.userInput],  // Pass as array for backward compatibility
      //     {
      //       ...options,
      //       file: baseOpts.files,
      //       model: baseOpts.modelId,
      //       stream: baseOpts.stream,
      //       dryRun: baseOpts.dryRun
      //     }
      //   );
        
      //   // Process file contents
      //   const contextPrompts = await processFileContext(baseOpts.files);
        
      //   // Use streaming option from BaseOptions
      //   const stream = baseOpts.stream;
        
      //   // Interactive chat loop
      //   const interactiveLoop = async () => {
      //     const rl = readline.createInterface({
      //       input: process.stdin,
      //       output: process.stdout,
      //       prompt: '> '
      //     });

      //     rl.prompt();

      //     rl.on('line', async (line) => {
      //       if (line.trim().toLowerCase() === 'exit') {
      //         rl.close();
      //         return;
      //       }

      //       // Update prompt context with new input
      //       promptContext.userInput = line;
      //       promptContext.variables.user_input = line;

      //       // Add user message to history


      //       // Execute request
      //       const response = await executeModelRequest({
      //         promptContext,
      //         modelConfig,
      //         contextPrompts,
      //         stream,
      //         //history
      //       });

      //       // Add AI response to history and save
      //       //   history.addUserMessage(line);
      //       // history.addAIMessage(response);
      //       // await saveHistory(historyFile, history);
           
           
      //       process.stdout.write('\n');
      //       rl.prompt();
      //     });

      //     rl.on('close', () => {
      //       console.log('Exiting chat...');
      //       process.exit(0);
      //     });
      //   };

      //   // Single exchange mode
      //   const singleExchange = async () => {
      //     // Show help if no input
      //     if (!promptContext.userInput && !baseOpts.promptTemplate && baseOpts.userInput.trim() === '') {
      //       chatCommand.help();
      //       return;
      //     }
          
      //     // Add user message to history
      //     if (baseOpts.userInput) {
      //     //  history.addUserMessage(baseOpts.userInput);
      //     }

      //     // Execute request
      //     const response = await executeModelRequest({
      //       promptContext,
      //       modelConfig,
      //       contextPrompts,
      //       stream,
      //       //history
      //     });

      //     // Add AI response to history and save
      //     // history.addAIMessage(response);
      //     // await saveHistory(historyFile, history);
      //   };

      //   // Run in appropriate mode
      //   if (options.interactive) {
      //     await interactiveLoop();
      //   } else {
      //     await singleExchange();
      //   }
      } catch (error) {
        logger.error(`Error: ${error}`);
        process.exit(1);
      }
    });

  return chatCommand;
};
