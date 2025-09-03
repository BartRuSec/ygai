import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import { FileReader, FileProcessingError } from './base-reader';
import logger from '../../utils/logger';

/**
 * Reader for PDF files
 */
export class PdfReader implements FileReader {
  /**
   * Reads a PDF file and converts its content to markdown
   * @param filePath The path to the file
   * @returns The file content as markdown
   */
  async read(filePath: string): Promise<string> {
    try {
      // Read the file as a buffer
      const dataBuffer = fs.readFileSync(filePath);
      
      try {
        // Parse the PDF
        const data = await pdfParse(dataBuffer);
        
        // Extract text content and metadata
        const { text, info, metadata, numPages } = data;
        
        // Format the output with the file name as a header
        const fileName = path.basename(filePath);
        
        // Build markdown with metadata and content
        let markdown = `# ${fileName}\n\n`;
        
        // Add metadata if available
        markdown += '## Document Information\n\n';
        
        // Add basic file info
        markdown += `- **Pages**: ${numPages}\n`;
        
        // Add PDF metadata if available
        if (info) {
          if (info.Title) markdown += `- **Title**: ${info.Title}\n`;
          if (info.Author) markdown += `- **Author**: ${info.Author}\n`;
          if (info.Subject) markdown += `- **Subject**: ${info.Subject}\n`;
          if (info.Keywords) markdown += `- **Keywords**: ${info.Keywords}\n`;
          if (info.Creator) markdown += `- **Creator**: ${info.Creator}\n`;
          if (info.Producer) markdown += `- **Producer**: ${info.Producer}\n`;
          if (info.CreationDate) {
            try {
              const date = new Date(info.CreationDate);
              markdown += `- **Creation Date**: ${date.toISOString().split('T')[0]}\n`;
            } catch (e) {
              markdown += `- **Creation Date**: ${info.CreationDate}\n`;
            }
          }
        }
        
        markdown += '\n';
        
        // Add content
        markdown += '## Content\n\n';
        markdown += text.trim();
        
        return markdown;
      } catch (pdfError) {
        logger.debug(`Error parsing PDF file ${filePath}: ${pdfError}`);
        throw new FileProcessingError(`Error parsing PDF: ${pdfError.message}`, filePath);
      }
    } catch (error) {
      if (error instanceof FileProcessingError) {
        throw error;
      }
      logger.debug(`Error reading file ${filePath}: ${error}`);
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
    return ext === '.pdf';
  }
}
