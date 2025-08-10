import fs from 'fs';
import path from 'path';
import { FileReader, FileProcessingError, isBinaryFile } from './base-reader';
import logger from '../../utils/logger';

/**
 * Reader for JSON files
 */
export class JsonReader implements FileReader {
  /**
   * Reads a JSON file and converts its content to markdown
   * @param filePath The path to the file
   * @returns The file content as markdown
   */
  async read(filePath: string): Promise<string> {
    try {
      // Read the file as a buffer first to check if it's binary
      const buffer = fs.readFileSync(filePath);
      
      if (isBinaryFile(buffer)) {
        throw new FileProcessingError(`File appears to be binary and cannot be processed as JSON`, filePath);
      }
      
      // Read the file as text
      const content = buffer.toString('utf-8');
      
      try {
        // Parse the JSON to validate it and format it nicely
        const jsonObject = JSON.parse(content);
        const formattedJson = JSON.stringify(jsonObject);
        
        // Format the output with the file name as a header and the JSON in a code block
        return `\`\`\`json\n${formattedJson}\n\`\`\``;
      } catch (jsonError) {
        logger.error(`Error parsing JSON file ${filePath}: ${jsonError}`);
        throw new FileProcessingError(`Error parsing JSON: ${jsonError.message}`, filePath);
      }
    } catch (error) {
      if (error instanceof FileProcessingError) {
        throw error;
      }
      logger.error(`Error reading JSON file ${filePath}: ${error}`);
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
    return ext === '.json';
  }
}
