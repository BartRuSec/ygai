import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import logger from '../utils/logger';
import { createRequire } from 'module';

// Use the global .ygai directory in the user's home directory for provider installation
// This ensures all providers are installed globally and shared across projects
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
export const installProviderPackage = async (provider: string): Promise<boolean> => {
  try {
    // Check if provider is already installed
    if (isProviderInstalled(provider)) {
      logger.debug(`Provider "${provider}" is already installed`);
      return true;
    }
    
    // Install the provider package in the global .ygai directory
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

/**
 * Loads a package from the global .ygai providers directory
 * @param pkgName The name of the package to load
 * @returns The loaded package
 */
export const loadPackage = async (pkgName: string): Promise<any> => {
  const pluginsDir = path.resolve(PROVIDERS_DIR);
  const pluginRequire = createRequire(pluginsDir + '/');
  
  try {
    // First try the standard import
    const resolvedPath = pluginRequire.resolve(pkgName);
    logger.debug(`Provider resolved path: ${resolvedPath}`);
    return await import(resolvedPath);
  } catch (firstError) {
    // If that fails, try the chat_models subpath for langchain providers
    if (pkgName.startsWith('@langchain/')) {
      try {
        const chatModelsPath = `${pkgName}/chat_models`;
        const resolvedPath = pluginRequire.resolve(chatModelsPath);
        logger.debug(`Provider chat_models resolved path: ${resolvedPath}`);
        return await import(resolvedPath);
      } catch (secondError) {
        throw new Error(`Failed to import provider "${pkgName}" from both root and chat_models paths`);
      }
    } else {
      throw firstError;
    }
  }
};

/**
 * Gets all installed provider names from the global ygai package.json
 * @returns Array of installed provider names
 */
export const getInstalledProviders = (): string[] => {
  try {
    if (!fs.existsSync(PACKAGE_JSON_PATH)) {
      return [];
    }
    
    const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
    return Object.keys(packageJson.dependencies || {});
  } catch (error) {
    logger.error(`Error getting installed providers: ${error}`);
    return [];
  }
};

/**
 * Uninstalls a provider package
 * @param provider The provider package to uninstall
 * @returns True if the uninstallation was successful, false otherwise
 */
export const uninstallProviderPackage = async (provider: string): Promise<boolean> => {
  try {
    if (!isProviderInstalled(provider)) {
      logger.debug(`Provider "${provider}" is not installed`);
      return true;
    }
    
    logger.info(`Uninstalling provider: ${provider}`);
    execSync(`npm uninstall ${provider}`, { 
      stdio: 'inherit',
      cwd: PROVIDERS_DIR
    });
    
    logger.info(`Provider "${provider}" uninstalled successfully`);
    return true;
  } catch (error) {
    logger.error(`Failed to uninstall provider "${provider}": ${error}`);
    return false;
  }
};

/**
 * Upgrades a provider package to the latest version
 * @param provider The provider package to upgrade
 * @returns True if the upgrade was successful, false otherwise
 */
export const upgradeProviderPackage = async (provider: string): Promise<boolean> => {
  try {
    if (!isProviderInstalled(provider)) {
      logger.warn(`Provider "${provider}" is not installed, cannot upgrade`);
      return false;
    }
    
    logger.info(`Upgrading provider: ${provider}`);
    execSync(`npm install ${provider}@latest`, { 
      stdio: 'inherit',
      cwd: PROVIDERS_DIR
    });
    
    logger.info(`Provider "${provider}" upgraded successfully`);
    return true;
  } catch (error) {
    logger.error(`Failed to upgrade provider "${provider}": ${error}`);
    return false;
  }
};

/**
 * Creates a module registry containing all installed modules from global .ygai directory
 * This provides access to all modules for dynamic class loading
 * @returns A Map of module names to loaded modules
 */
export const createModuleRegistry = async (): Promise<Map<string, any>> => {
  const moduleRegistry = new Map<string, any>();
  
  try {
    const installedProviders = getInstalledProviders();
    logger.debug(`Creating module registry for ${installedProviders.length} installed providers`);
    
    // Load each installed provider
    for (const moduleName of installedProviders) {
      try {
        logger.debug(`Loading module: ${moduleName}`);
        const module = await loadPackage(moduleName);
        moduleRegistry.set(moduleName, module);
        
        // Also try to load chat_models subpath for langchain providers
        if (moduleName.startsWith('@langchain/')) {
          try {
            const chatModelsModule = await loadPackage(`${moduleName}/chat_models`);
            moduleRegistry.set(`${moduleName}/chat_models`, chatModelsModule);
            logger.debug(`Also loaded: ${moduleName}/chat_models`);
          } catch (chatModelsError) {
            // It's okay if chat_models doesn't exist for this module
            logger.debug(`No chat_models subpath for ${moduleName}`);
          }
        }
      } catch (error) {
        logger.warn(`Failed to load module ${moduleName}: ${error}`);
        // Continue loading other modules even if one fails
      }
    }
    
    logger.debug(`Module registry created with ${moduleRegistry.size} modules`);
    return moduleRegistry;
  } catch (error) {
    logger.error(`Error creating module registry: ${error}`);
    return moduleRegistry;
  }
};
