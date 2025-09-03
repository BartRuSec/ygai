import { Command } from 'commander';
import { loadConfig } from '../config';
import { setVerbose } from '../utils/logger';
import logger from '../utils/logger';
import { CliOptions } from './prompt-options';
import { updateLoadingStage } from '../ui';



/**
 * Set verbose logging if requested
 * @param options Command options
 */
export const handleVerboseLogging = (options: any): void => {
  if (options.verbose) {
    setVerbose(true);
    logger.debug('Verbose logging enabled');
  }
};
/**
 * Common setup for CLI commands
 * @param program Commander program instance
 * @param options Command-specific options
 * @returns Configuration and model information
 */


export const commonSetup = (program: Command, options: CliOptions) => {
  const globalOptions = program.opts();
  handleVerboseLogging(globalOptions);
  const config = loadConfig();
  return config;
};

export const readStdin=async()=>{
  let stdinContent: string | undefined;
  const hasStdin = !process.stdin.isTTY;
  if (hasStdin) {
  // Read all stdin data
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    stdinContent = Buffer.concat(chunks).toString().trim();
  }
  return stdinContent;
}