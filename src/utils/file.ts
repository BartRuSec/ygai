import fs from 'fs';
import path from 'path';
import os from 'os';
import logger from './logger';

/**
 * Ensures a directory exists, creating it if necessary
 */
export const ensureDirectoryExists = (dirPath: string): void => {
  if (!fs.existsSync(dirPath)) {
    logger.debug(`Creating directory: ${dirPath}`);
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

/**
 * Gets the path to the user's home directory
 */
export const getHomeDirectory = (): string => {
  return os.homedir();
};

/**
 * Gets the path to the .ygai directory in the specified base directory
 */
export const getYgaiDirectory = (baseDir: string): string => {
  return path.join(baseDir, '.ygai');
};

/**
 * Gets the path to the config file in the specified directory
 */
export const getConfigPath = (baseDir: string): string => {
  return path.join(getYgaiDirectory(baseDir), 'config.yaml');
};

/**
 * Gets the path to the sessions directory in the specified base directory
 */
export const getSessionsDirectory = (baseDir: string): string => {
  const sessionsDir = path.join(getYgaiDirectory(baseDir), 'sessions');
  ensureDirectoryExists(sessionsDir);
  return sessionsDir;
};

/**
 * Gets the path to a specific session file
 */
export const getSessionPath = (baseDir: string, sessionName: string): string => {
  return path.join(getSessionsDirectory(baseDir), `${sessionName}.json`);
};

/**
 * Checks if a file exists
 */
export const fileExists = (filePath: string): boolean => {
  return fs.existsSync(filePath);
};

/**
 * Reads a file as text
 */
export const readFile = (filePath: string): string => {
  return fs.readFileSync(filePath, 'utf-8');
};

/**
 * Writes text to a file
 */
export const writeFile = (filePath: string, content: string): void => {
  const dir = path.dirname(filePath);
  ensureDirectoryExists(dir);
  fs.writeFileSync(filePath, content, 'utf-8');
};
