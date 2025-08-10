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
 * Checks if a file is likely binary
 * @param buffer The file buffer to check
 * @returns True if the file is likely binary, false otherwise
 */
export const isBinaryFile = (buffer: Buffer): boolean => {
  // Check for null bytes which are common in binary files
  if (buffer.includes(0)) {
    return true;
  }

  // Check for a high percentage of non-printable characters
  const nonPrintableCount = buffer.reduce((count, byte) => {
    // ASCII control characters (except common whitespace)
    if ((byte < 32 && ![9, 10, 13].includes(byte)) || byte >= 127) {
      return count + 1;
    }
    return count;
  }, 0);

  // If more than 10% of the first 1024 bytes are non-printable, consider it binary
  const sampleSize = Math.min(buffer.length, 1024);
  return nonPrintableCount / sampleSize > 0.1;
};
