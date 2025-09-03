import fs from 'fs';
import path from 'path';
import { FileReader, FileProcessingError, isBinaryFile } from './base-reader';
import logger from '../../utils/logger';

/**
 * Reader for Markdown files
 */
export class MarkdownReader implements FileReader {
  /**
   * Reads a markdown file and returns its content
   * @param filePath The path to the file
   * @returns The file content as markdown
   */
  async read(filePath: string): Promise<string> {
    try {
      // Read the file as a buffer first to check if it's binary
      const buffer = fs.readFileSync(filePath);
      
      if (isBinaryFile(buffer)) {
        throw new FileProcessingError(`File appears to be binary and cannot be processed as markdown`, filePath);
      }
      
      // Read the file as text
      const content = buffer.toString('utf-8');
      
      // For markdown files, we can use the content directly
      // Just add a header with the file name
      const fileName = path.basename(filePath);
      return content;
    } catch (error) {
      if (error instanceof FileProcessingError) {
        throw error;
      }
      logger.debug(`Error reading markdown file ${filePath}: ${error}`);
      throw new FileProcessingError(`Error reading file: ${error.message}`, filePath);
    }
  }

  /**
   * Checks if this reader supports the given file
   * @param filePath The path to the file
   * @returns True if this reader supports the file, false otherwise
   */
  supports(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.md' || ext === '.markdown';
  }
}
