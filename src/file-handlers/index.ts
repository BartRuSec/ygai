import fs from 'fs';
import path from 'path';
import { FileReader, FileProcessingError } from './readers/base-reader';
import { TextReader } from './readers/text-reader';
import { MarkdownReader } from './readers/markdown-reader';
import { JsonReader } from './readers/json-reader';
import { YamlReader } from './readers/yaml-reader';
import { HtmlReader } from './readers/html-reader';
import { PdfReader } from './readers/pdf-reader';
import { DocxReader } from './readers/docx-reader';
import { XlsxReader } from './readers/xlsx-reader';
import { OdtReader } from './readers/odt-reader';
import logger from '../utils/logger';

// Export all readers
export { FileReader, FileProcessingError } from './readers/base-reader';
export { TextReader } from './readers/text-reader';
export { MarkdownReader } from './readers/markdown-reader';
export { JsonReader } from './readers/json-reader';
export { YamlReader } from './readers/yaml-reader';
export { HtmlReader } from './readers/html-reader';
export { PdfReader } from './readers/pdf-reader';
export { DocxReader } from './readers/docx-reader';
export { XlsxReader } from './readers/xlsx-reader';
export { OdtReader } from './readers/odt-reader';


/**
 * Registry of file readers
 */
const readers: FileReader[] = [
  new MarkdownReader(),
  new JsonReader(),
  new YamlReader(),
  new HtmlReader(),
  new PdfReader(),
  new DocxReader(),
  new XlsxReader(),
  new OdtReader(),
  // TextReader should be last as it's the fallback
  new TextReader()
];

export interface FileContext {
    filePath: string;
    content: string;
}


/**
 * Gets the appropriate reader for a file
 * @param filePath The path to the file
 * @returns The reader for the file
 */
export const getReaderForFile = (filePath: string): FileReader => {
  // Check if the file exists
  if (!fs.existsSync(filePath)) {
    throw new FileProcessingError(`File not found: ${filePath}`, filePath);
  }
  
  // Find the first reader that supports the file
  let reader = readers.find(reader => reader.supports(filePath));
  
  if (!reader) {
    // // This should never happen as TextReader is a fallback
    // throw new FileProcessingError(`No reader found for file: ${filePath}`, filePath);
    reader=new TextReader();
  }
  
  return reader;
};


/**
 * Reads a file and converts its content to markdown
 * @param filePath The path to the file
 * @returns The file content as markdown
 */
export const readFileAsMarkdown = async (filePath: string): Promise<FileContext> => {
  try {
    const reader = getReaderForFile(filePath);
    logger.debug(`Using ${reader.constructor.name} for file: ${filePath}`);
    const content = await reader.read(filePath);
    return {
            filePath,
            content
    }
  } catch (error) {
    if (error instanceof FileProcessingError) {
      throw error;
    }
    logger.error(`Error reading file ${filePath}: ${error}`);
    throw new FileProcessingError(`Error reading file: ${error.message}`, filePath);
  }
};

/**
 * Reads multiple files and converts their content to markdown
 * Uses parallel processing for better performance
 * @param filePaths The paths to the files
 * @returns An array of file contents as markdown
 */
export const readFilesAsMarkdown = async (filePaths: string[]): Promise<FileContext[]> => {
  // Process files in parallel for better performance
  const filePromises = filePaths.map(async (filePath) => {
    try {
      return await readFileAsMarkdown(filePath);
    } catch (error) {
      logger.error(`Error reading file ${filePath}: ${error}`);
      return {
        filePath,
        content: `Error reading file: ${error.message}`
      };
    }
  });
  
  return await Promise.all(filePromises);
};
