import winston from 'winston';
import Transport from 'winston-transport';
import { stopLoading } from '../ui';

let isVerbose = false;

// Custom transport that intercepts logs to stop loading indicator
class InterceptConsoleTransport extends Transport {
  constructor(opts: winston.transports.ConsoleTransportOptions = {}) {
    super(opts);
    // Set up the format for this transport
    this.format = winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    );
  }

  log(info: any, callback: () => void) {
    // Stop loading indicator before log output, except for debug level
    if (isVerbose || info.level !== 'debug') {
      stopLoading();
    }
    // Apply formatting and write to console
    const formatted  = this.format.transform(info);
    if (formatted) {
      const message = formatted[Symbol.for('message')] ;
      console.log(message);
    } else console.log(info?.message);
    
    callback();
  }
}

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
    new InterceptConsoleTransport(),
  ],
});

// Set the log level based on verbose flag
export const setVerbose = (verbose: boolean): void => {
  isVerbose = verbose;
  logger.level = verbose ? 'debug' : 'info';
};



export default logger;
