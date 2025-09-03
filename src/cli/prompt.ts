import { Command } from 'commander';
import logger from '../utils/logger';
import { CliOptions } from './prompt-options';
import { commonSetup, readStdin } from './utils';
import { addCommonPromptOptions } from './prompt-options';
import { exec } from 'child_process';
import { WorkflowManager } from '../workflows/workflow-manager';
import { resolveExecutionConfig } from './execution-config-resolver';
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
    .action(async (promptName, promptArgs, options: CliOptions) => {
      try {
        // Start loading indicator first
        startLoading({ message: 'Warming up...', showTokenCount: true });
        
        // Common setup
        const config = commonSetup(program, options);
        const stdin = await readStdin();
        
        // Resolve execution config using functional approach
        const executionConfig = resolveExecutionConfig(
          config,
          options,
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
        // Loading indicator will be stopped automatically by logger event
        logger.error(`${error}`);
        process.exit(1);
      }
    });

  return promptCommand;
};
