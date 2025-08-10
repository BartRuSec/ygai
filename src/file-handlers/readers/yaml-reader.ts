import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { FileReader, FileProcessingError, isBinaryFile } from './base-reader';
import logger from '../../utils/logger';

/**
 * Reader for YAML files
 */
export class YamlReader implements FileReader {
  /**
   * Reads a YAML file and converts its content to markdown
   * @param filePath The path to the file
   * @returns The file content as markdown
   */
  async read(filePath: string): Promise<string> {
    try {
      // Read the file as a buffer first to check if it's binary
      const buffer = fs.readFileSync(filePath);
      
      if (isBinaryFile(buffer)) {
        throw new FileProcessingError(`File appears to be binary and cannot be processed as YAML`, filePath);
      }
      
      // Read the file as text
      const content = buffer.toString('utf-8');
      
      try {
        // Parse the YAML to validate it
        const yamlObject = yaml.load(content);
        return `\`\`yaml\n${content}\n\`\`\``;
      } catch (yamlError) {
        logger.error(`Error parsing YAML file ${filePath}: ${yamlError}`);
        throw new FileProcessingError(`Error parsing YAML: ${yamlError.message}`, filePath);
      }
    } catch (error) {
      if (error instanceof FileProcessingError) {
        throw error;
      }
      logger.error(`Error reading YAML file ${filePath}: ${error}`);
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
    return ext === '.yaml' || ext === '.yml';
  }
}
