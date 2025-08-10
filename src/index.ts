/**
 * Yet Another Gen AI CLI Tool (ygai)
 * 
 * A command-line tool for communication with LLMs via the command line.
 */

// Re-export modules for programmatic usage
export * from './config';
export * from './models';
export * from './history';
export * from './utils/logger';
export * from './utils/file';

// Export the CLI functionality
export { configureProgram } from './cli/index';
