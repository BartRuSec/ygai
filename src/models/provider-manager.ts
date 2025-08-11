import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import logger from '../utils/logger';

// Use the home directory for provider installation
export const PROVIDERS_DIR = path.join(os.homedir(), '.ygai');
export const PACKAGE_JSON_PATH = path.join(PROVIDERS_DIR, 'package.json');

/**
 * Checks if a provider is installed by looking at package.json in the .ygai folder
 * @param provider The provider to check
 * @returns True if the provider is installed, false otherwise
 */
export const isProviderInstalled = (provider: string): boolean => {
  try {
    // Check if package.json exists in the .ygai folder
    if (!fs.existsSync(PACKAGE_JSON_PATH)) {
      return false;
    }
    
    // Read package.json to check if the provider is in dependencies
    const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
    
    // Check in dependencies
    return !!(packageJson.dependencies && packageJson.dependencies[provider]);
  } catch (error) {
    logger.error(`Error checking if provider "${provider}" is installed: ${error}`);
    return false;
  }
};

/**
 * Installs a provider package
 * @param provider The provider package to install
 * @returns True if the installation was successful, false otherwise
 */
export const installProviderPackage = (provider: string): boolean => {
  try {
    // Check if provider is already installed
    if (isProviderInstalled(provider)) {
      logger.debug(`Provider "${provider}" is already installed`);
      return true;
    }
    
    // Install the provider package in the home directory
    logger.debug(`Installing package: ${provider}`);
    logger.debug(`ygai directory ${PROVIDERS_DIR}`)
    // Create the providers directory if it doesn't exist
    fs.mkdirSync(PROVIDERS_DIR, { recursive: true });
    
    // Initialize package.json if it doesn't exist
      if (!fs.existsSync(PACKAGE_JSON_PATH)) {
        const packageJsonContent = {
            name: "ygai-providers",
            version: "1.0.0",
            description: "YGAI provider packages",
            private: true
        };
        fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageJsonContent, null, 2));
      }
    
    // Install the package
    execSync(`npm install ${provider}`, { 
      stdio: 'inherit',
      cwd: PROVIDERS_DIR
    });
    
    return true;
  } catch (error) {
    logger.error(`Failed to install provider "${provider}": ${error}`);
    return false;
  }
};
