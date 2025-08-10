import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import TurndownService from 'turndown';
import { FileReader, FileProcessingError } from './base-reader';
import logger from '../../utils/logger';

/**
 * Reader for DOCX files
 */
export class DocxReader implements FileReader {
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
   * Reads a DOCX file and converts its content to markdown
   * @param filePath The path to the file
   * @returns The file content as markdown
   */
  async read(filePath: string): Promise<string> {
    try {
      // Read the file as a buffer
      const buffer = fs.readFileSync(filePath);
      
      try {
        // Convert DOCX to HTML
        const result = await mammoth.convertToHtml({ buffer });
        const { value: html, messages } = result;
        
        // Log any conversion messages
        if (messages && messages.length > 0) {
          for (const message of messages) {
            logger.debug(`DOCX conversion message for ${filePath}: ${message.type} - ${message.message}`);
          }
        }
        
        // Convert HTML to markdown using turndown
        const markdown = this.turndownService.turndown(html);
        
        // Format the output with the file name as a header
        return markdown;
      } catch (conversionError) {
        logger.error(`Error converting DOCX to markdown for file ${filePath}: ${conversionError}`);
        throw new FileProcessingError(`Error converting DOCX to markdown: ${conversionError.message}`, filePath);
      }
    } catch (error) {
      if (error instanceof FileProcessingError) {
        throw error;
      }
      logger.error(`Error reading DOCX file ${filePath}: ${error}`);
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
    return ext === '.docx';
  }
}
