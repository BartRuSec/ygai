import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import { FileReader, FileProcessingError } from './base-reader';
import logger from '../../utils/logger';

/**
 * Reader for XLSX files
 */
export class XlsxReader implements FileReader {
  /**
   * Reads an XLSX file and converts its content to markdown
   * @param filePath The path to the file
   * @returns The file content as markdown
   */
  async read(filePath: string): Promise<string> {
    try {
      // Create a new workbook
      const workbook = new ExcelJS.Workbook();
      
      try {
        // Read the file
        await workbook.xlsx.readFile(filePath);
        
        // Convert to markdown
        const fileName = path.basename(filePath);
        let markdown = `# ${fileName}\n\n`;
        
        // Process each worksheet
        workbook.eachSheet((worksheet, sheetId) => {
          // Add worksheet name as a header
          markdown += `## ${worksheet.name}\n\n`;
          
          // Get all rows including empty ones
          const rows = worksheet.getRows(1, worksheet.rowCount) || [];
          
          // Skip if worksheet is empty
          if (rows.length === 0) {
            markdown += `*Empty worksheet*\n\n`;
            return;
          }
          
          // Get column count
          const columnCount = worksheet.columnCount;
          
          // Create header row for markdown table
          let tableHeader = '| ';
          let tableHeaderSeparator = '| ';
          
          for (let col = 1; col <= columnCount; col++) {
            const headerCell = worksheet.getCell(1, col);
            const headerText = headerCell.text || `Column ${col}`;
            tableHeader += `${headerText} | `;
            tableHeaderSeparator += '--- | ';
          }
          
          markdown += tableHeader + '\n' + tableHeaderSeparator + '\n';
          
          // Add data rows
          for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
            let rowData = '| ';
            let hasData = false;
            
            for (let col = 1; col <= columnCount; col++) {
              const cell = worksheet.getCell(rowNumber, col);
              const cellValue = cell.text || '';
              
              if (cellValue) {
                hasData = true;
              }
              
              rowData += `${cellValue} | `;
            }
            
            // Only add row if it has data
            if (hasData) {
              markdown += rowData + '\n';
            }
          }
          
          markdown += '\n';
        });
        
        return markdown;
      } catch (conversionError) {
        logger.debug(`Error converting XLSX to markdown for file ${filePath}: ${conversionError}`);
        throw new FileProcessingError(`Error converting XLSX to markdown: ${conversionError.message}`, filePath);
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
    return ext === '.xlsx' || ext === '.xlsm' || ext === '.xlsb';
  }
}
