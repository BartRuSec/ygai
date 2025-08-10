import fs from 'fs';
import path from 'path';
import TurndownService from 'turndown';
import { FileReader, FileProcessingError, isBinaryFile } from './base-reader';
import logger from '../../utils/logger';

/**
 * Reader for HTML files
 */
export class HtmlReader implements FileReader {
  private turndownService: TurndownService;

  constructor() {
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      emDelimiter: '*'
    });
    
    // Preserve certain HTML elements that are useful in markdown
    this.turndownService.keep(['pre', 'code']);
  }

  /**
   * Reads an HTML file and converts its content to markdown
   * @param filePath The path to the file
   * @returns The file content as markdown
   */
  async read(filePath: string): Promise<string> {
    try {
      // Read the file as a buffer first to check if it's binary
      const buffer = fs.readFileSync(filePath);
      
      if (isBinaryFile(buffer)) {
        throw new FileProcessingError(`File appears to be binary and cannot be processed as HTML`, filePath);
      }
      
      // Read the file as text
      const content = buffer.toString('utf-8');
      
      try {
        // Convert HTML to markdown
        const markdown = this.turndownService.turndown(content);
        
        return markdown;
      } catch (conversionError) {
        logger.error(`Error converting HTML to markdown for file ${filePath}: ${conversionError}`);
        throw new FileProcessingError(`Error converting HTML to markdown: ${conversionError.message}`, filePath);
      }
    } catch (error) {
      if (error instanceof FileProcessingError) {
        throw error;
      }
      logger.error(`Error reading HTML file ${filePath}: ${error}`);
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
    return ext === '.html' || ext === '.htm';
  }
}
