import { Command } from 'commander';
import { configurePromptCommand } from './prompt';
import { configureProvidersCommand } from './llms-providers';
import { configureChatCommand } from './chat';
import { version } from '../../package.json';

/**
 * Configure the CLI program with all commands
 * @returns The configured Commander program
 */
export const configureProgram = (): Command => {
  // Create the command-line interface
  const program = new Command();

  program
    .name('ygai')
    .description('Yet Another Gen AI CLI Tool')
    .version(version)
    .option('-v, --verbose', 'Enable verbose logging')
    .allowUnknownOption(true); // Allow unknown options for -D variables

  // Configure all commands
  configurePromptCommand(program);
  configureProvidersCommand(program);
  configureChatCommand(program);

  // Default command (for backward compatibility)
  program
    .action(() => {
      // If no command is specified, show help
      program.help();
    });

  return program;
};
