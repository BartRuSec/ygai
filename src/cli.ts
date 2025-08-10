#!/usr/bin/env node

import { configureProgram } from './cli/index';
import logger from './utils/logger';

// Configure the CLI program
const program = configureProgram();

// Parse the command-line arguments and execute
program.parse();

// Handle any unhandled errors
process.on('unhandledRejection', (error) => {
  logger.error(`Unhandled error: ${error}`);
  process.exit(1);
});
