import winston from 'winston';
import { stopLoading } from '../ui';

// Create a logger instance
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.printf(({ level, message}: { level: string, message: string }) => {
      const formattedTime = new Date().toLocaleString();
      return `${level}: ${formattedTime} ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Set the log level based on verbose flag
export const setVerbose = (verbose: boolean): void => {
  logger.level = verbose ? 'debug' : 'info';
};

// Listen for logging events and stop loading indicator
logger.on('error', async () => {
  // Stop loading indicator before any log output
  await stopLoading();
});
logger.on('warn', async () => {
  // Stop loading indicator before any log output
  await stopLoading();
});


export default logger;
