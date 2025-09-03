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
 * Resolves a file path, handling home directory expansion and relative paths
 * @param filePath The file path to resolve
 * @param basePath Optional base path for relative path resolution (defaults to current working directory)
 * @returns The resolved absolute path
 */
export const resolvePath = (filePath: string, basePath?: string): string => {
  // Handle home directory expansion (cross-platform)
  if (filePath.startsWith('~/')) {
    return path.join(getHomeDirectory(), filePath.slice(2));
  }
  
  // If already absolute, return as-is
  if (path.isAbsolute(filePath)) {
    return filePath;
  }
  
  // Handle relative paths
  const base = basePath || process.cwd();
  return path.resolve(base, filePath);
};

/**
 * Checks if a file exists (with path resolution support)
 * @param filePath The file path to check (supports ~/ expansion and relative paths)
 * @param basePath Optional base path for relative path resolution
 * @returns True if file exists, false otherwise
 */
export const fileExists = (filePath: string, basePath?: string): boolean => {
  const resolvedPath = resolvePath(filePath, basePath);
  return fs.existsSync(resolvedPath);
};

/**
 * Reads a file as text (with path resolution support)
 * @param filePath The file path to read (supports ~/ expansion and relative paths)
 * @param basePath Optional base path for relative path resolution
 * @returns The file content as a string
 * @throws Error if file cannot be read
 */
export const readFile = (filePath: string, basePath?: string): string => {
  const resolvedPath = resolvePath(filePath, basePath);
  logger.debug(`Reading file: ${filePath} -> ${resolvedPath}`);
  return fs.readFileSync(resolvedPath, 'utf-8');
};

/**
 * Writes text to a file
 */
export const writeFile = (filePath: string, content: string): void => {
  const dir = path.dirname(filePath);
  ensureDirectoryExists(dir);
  fs.writeFileSync(filePath, content, 'utf-8');
};

/**
 * Gets the path to the conversations database file
 */
export const getConversationsDbPath = (useGlobal: boolean = false): string => {
  const baseDir = useGlobal ? getHomeDirectory() : process.cwd();
  const ygaiDir = getYgaiDirectory(baseDir);
  ensureDirectoryExists(ygaiDir);
  return path.join(ygaiDir, 'conversations.db');
};
