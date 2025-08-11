import { Command } from 'commander';
import { execSync } from 'child_process';
import fs from 'fs';
import { PROVIDERS_DIR, PACKAGE_JSON_PATH } from '../models';
import logger from '../utils/logger';
import { handleVerboseLogging } from './utils';

/**
 * Gets the list of installed providers from package.json
 * @returns Array of installed provider names
 */
const getInstalledProviders = (): string[] => {
  try {
    // Check if package.json exists
    if (!fs.existsSync(PACKAGE_JSON_PATH)) {
      return [];
    }
    
    // Read package.json
    const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
    
    // Get dependencies
    const dependencies = packageJson.dependencies || {};
    
    // Return array of provider names
    return Object.keys(dependencies);
  } catch (error) {
    logger.error(`Error getting installed providers: ${error}`);
    return [];
  }
};

/**
 * Configure the providers command
 * @param program The Commander program instance
 * @returns The configured command
 */
export const configureProvidersCommand = (program: Command): Command => {
  const llmsCommand = program
    .command('llms')
    .alias('l')
    .description('Manage LLM providers');

  // Subcommand: llms list
  llmsCommand
    .command('list')
    .description('List all installed providers')
    .action(async () => {
      try {
        // Handle global options
        const globalOptions = program.opts();
        handleVerboseLogging(globalOptions);
        
        const providers = getInstalledProviders();
        if (providers.length === 0) {
          console.log('No providers installed');
        } else {
          console.log('Installed providers:');
          providers.forEach(provider => {
            console.log(`- ${provider}`);
          });
          
          // Try to get the last modified time of package.json
          try {
            const stats = fs.statSync(PACKAGE_JSON_PATH);
            console.log(`\nLast updated: ${stats.mtime.toLocaleString()}`);
          } catch (error) {
            // Ignore error if can't get last modified time
          }
        }
      } catch (error) {
        logger.error(`${error}`);
        process.exit(1);
      }
    });

  // Subcommand: llms upgrade
  llmsCommand
    .command('upgrade')
    .description('Upgrade all installed providers to latest version')
    .action(async () => {
      try {
        // Handle global options
        const globalOptions = program.opts();
        handleVerboseLogging(globalOptions);
        
        const providers = getInstalledProviders();
        if (providers.length === 0) {
          console.log('No providers to upgrade');
          return;
        }

        console.log('Upgrading providers:');
        for (const provider of providers) {
          try {
            console.log(`- ${provider}`);
            execSync(`npm install ${provider}@latest`, { 
              stdio: 'inherit',
              cwd: PROVIDERS_DIR
            });
          } catch (error) {
            logger.error(`Failed to upgrade provider ${provider}: ${error}`);
          }
        }
        
        console.log('\nAll providers upgraded successfully');
      } catch (error) {
        logger.error(`${error}`);
        process.exit(1);
      }
    });

  // Subcommand: llms clean
  llmsCommand
    .command('clean')
    .description('Remove all installed providers')
    .action(async () => {
      try {
        // Handle global options
        const globalOptions = program.opts();
        handleVerboseLogging(globalOptions);
        
        const providers = getInstalledProviders();
        if (providers.length === 0) {
          console.log('No providers to remove');
          return;
        }

        console.log('Removing providers:');
        for (const provider of providers) {
          try {
            console.log(`- ${provider}`);
            execSync(`npm uninstall ${provider}`, { 
              stdio: 'inherit',
              cwd: PROVIDERS_DIR
            });
          } catch (error) {
            logger.error(`Failed to remove provider ${provider}: ${error}`);
          }
        }
        
        console.log('\nAll providers removed successfully');
      } catch (error) {
        logger.error(`${error}`);
        process.exit(1);
      }
    });

  return llmsCommand;
};
