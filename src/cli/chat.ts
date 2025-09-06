import { Command } from 'commander';
import readline from 'readline';
import { addCommonPromptOptions} from './prompt-options';
//import { createPromptContext } from './prompt-handler';
//import { processFileContext, executeModelRequest } from './execution-flow';

import { CliOptions } from './prompt-options';
import { commonSetup, readStdin } from './utils';

import logger from '../utils/logger';
import { WorkflowManager } from '../workflows/workflow-manager';
import { resolveExecutionConfig } from './execution-config-resolver';
import { startLoading } from '../ui/ui-manager';

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
    .option('--session <name>', 'Use specific conversation session (default: "default")')
    .option('--checkpoint <id>', 'Start conversation from specific checkpoint ID')
  //  .option('-i, --interactive', 'Enter interactive mode (continuous conversation until exit)')
    .action(async (promptName, promptArgs, options: CliOptions & { interactive?: boolean }) => {
      try {
        startLoading({ message: 'Warming up...', showTokenCount: true });
              
           // Common setup
        const config = commonSetup(program, options);
        
        const stdin = await readStdin();
        
        // Resolve execution config for chat mode
        const executionConfig = resolveExecutionConfig(
          config,
          { ...options, session: options.session || 'default' }, // Ensure session is set for chat
          promptName,
          promptArgs,
          stdin || undefined
        );
        
        // Execute using WorkflowManager
        const workflowManager = new WorkflowManager();
        await workflowManager.execute(executionConfig);
        
        // If we reach here, workflow succeeded
        process.exit(0);
      } catch (error) {
        logger.error(`${error}`);
        process.exit(1);
      }
    });

  return chatCommand;
};
