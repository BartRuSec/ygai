import { isBinaryFileSync} from 'isbinaryfile';

/**
 * Base interface for file readers
 */
export interface FileReader {
  /**
   * Reads a file and converts its content to markdown
   * @param filePath The path to the file
   * @returns The file content as markdown
   */
  read(filePath: string): Promise<string>;

  /**
   * Checks if this reader supports the given file
   * @param filePath The path to the file
   * @returns True if this reader supports the file, false otherwise
   */
  supports(filePath: string): boolean;
}

/**
 * Error thrown when a file cannot be processed
 */
export class FileProcessingError extends Error {
  constructor(message: string, public readonly filePath: string) {
    super(message);
    this.name = 'FileProcessingError';
  }
}

/**
 * Checks if a file is likely binary using the isbinaryfile library
 * This library properly handles UTF-8, UTF-16, UTF-32 and various text encodings,
 * including international characters like Polish ęź or Chinese characters.
 * @param buffer The file buffer to check
 * @returns True if the file is likely binary, false otherwise
 */
export const isBinaryFile = (buffer: Buffer): boolean => {
  return isBinaryFileSync(buffer);
};
