import fs from 'fs';
import path from 'path';
import { FileReader, FileProcessingError, isBinaryFile } from './base-reader';
import logger from '../../utils/logger';

/**
 * Reader for plain text files
 */
export class TextReader implements FileReader {
  /**
   * Reads a text file and returns its content
   * @param filePath The path to the file
   * @returns The file content as markdown
   */
  async read(filePath: string): Promise<string> {
    try {
      // Read the file as a buffer first to check if it's binary
      const buffer = fs.readFileSync(filePath);
      
      if (isBinaryFile(buffer)) {
        throw new FileProcessingError(`File appears to be binary and cannot be processed as text`, filePath);
      }
      
      // Read the file as text
      const content = buffer.toString('utf-8');
      
      return content;
    } catch (error) {
      if (error instanceof FileProcessingError) {
        throw error;
      }
      logger.error(`Error reading text file ${filePath}: ${error}`);
      throw new FileProcessingError(`Error reading file: ${error.message}`, filePath);
    }
  }

  /**
   * Checks if this reader supports the given file
   * @param filePath The path to the file
   * @returns True if this reader supports the file, false otherwise
   */
  supports(filePath: string): boolean {
    // This is a fallback reader for any text-based file
    // It will be used if no other reader claims the file
    return true;
  }
}
