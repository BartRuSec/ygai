import fs from 'fs';
import path from 'path';
import { FileReader, FileProcessingError } from './base-reader';
import logger from '../../utils/logger';
import officeparser from 'officeparser';
/**
 * Reader for LibreOffice ODF files (ODT, ODS, ODP)
 */
export class OdtReader implements FileReader {


  /**
   * Reads an ODF file and converts its content to markdown
   * @param filePath The path to the file
   * @returns The file content as markdown
   */
  async read(filePath: string): Promise<string> {
    try {
      // Read the file as a buffer
      const buffer = fs.readFileSync(filePath);
      
      try {
        // Parse ODF content to markdown

        const content= await officeparser.parseOfficeAsync(filePath);
        return content;
      } catch (conversionError) {
        logger.debug(`Error converting ODF to text for file ${filePath}: ${conversionError}`);
        throw new FileProcessingError(`Error converting ODF to text: ${conversionError.message}`, filePath);
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
    return ['.odt', '.ods', '.odp','.pptx'].includes(ext);
  }
}
