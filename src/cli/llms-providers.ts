import { Command } from 'commander';
import { getInstalledProviders, upgradeProviderPackage, uninstallProviderPackage, PROVIDERS_DIR } from '../models/provider-manager';
import logger from '../utils/logger';
import { handleVerboseLogging } from './utils';
import fs from 'fs';
import path from 'path';

// Define package.json path
const PACKAGE_JSON_PATH = path.join(PROVIDERS_DIR, 'package.json');

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
            console.log(`- Upgrading ${provider}...`);
            const success = await upgradeProviderPackage(provider);
            if (success) {
              console.log(`  ✓ ${provider} upgraded successfully`);
            } else {
              console.log(`  ✗ Failed to upgrade ${provider}`);
            }
          } catch (error) {
            logger.error(`Failed to upgrade provider ${provider}: ${error}`);
          }
        }
        
        console.log('\nProvider upgrade process completed');
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
            console.log(`- Removing ${provider}...`);
            const success = await uninstallProviderPackage(provider);
            if (success) {
              console.log(`  ✓ ${provider} removed successfully`);
            } else {
              console.log(`  ✗ Failed to remove ${provider}`);
            }
          } catch (error) {
            logger.error(`Failed to remove provider ${provider}: ${error}`);
          }
        }
        
        console.log('\nProvider removal process completed');
      } catch (error) {
        logger.error(`${error}`);
        process.exit(1);
      }
    });

  return llmsCommand;
};
