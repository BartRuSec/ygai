// import { describe, expect, test, vi, beforeEach } from 'vitest';
// import fs from 'fs';
// import path from 'path';
// import os from 'os';
// import { 
//   createHistory, 
//   loadHistory, 
//   saveHistory, 
//   getDefaultHistoryPath,
//   type HistoryData
// } from './history-manager';
// import { InMemoryChatMessageHistory } from '@langchain/core/chat_history';
// import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
// import logger from '../utils/logger';

// // Mock fs and logger
// vi.mock('fs');
// vi.mock('../utils/logger', () => ({
//   default: {
//     info: vi.fn(),
//     error: vi.fn()
//   }
// }));

// describe('HistoryManager', () => {
//   const testHistoryFile = path.join(os.tmpdir(), 'history.json');
//   let history: InMemoryChatMessageHistory;

//   beforeEach(() => {
//     vi.restoreAllMocks();
//     history = createHistory();
//   });

//   describe('createHistory()', () => {
//     test('should return an instance of InMemoryChatMessageHistory', () => {
//       expect(history).toBeInstanceOf(InMemoryChatMessageHistory);
//     });
//   });

//   describe('getDefaultHistoryPath()', () => {
//     test('should return the correct default path', () => {
//       const expectedPath = path.join(process.cwd(), '.ygai-chat');
//       expect(getDefaultHistoryPath()).toBe(expectedPath);
//     });
//   });

//   describe('loadHistory()', () => {
//     test('should return false when file does not exist', () => {
//       vi.spyOn(fs, 'existsSync').mockReturnValue(false);
//       const result = loadHistory(testHistoryFile, history);
//       expect(result).toBe(false);
//       expect(logger.info).not.toHaveBeenCalled();
//     });

//     test('should load user messages correctly', async () => {
//       const mockData: HistoryData = {
//         messages: [{ type: 'user', data: 'Hello user' }]
//       };
//       setupFileMocks(mockData);
      
//       const result = loadHistory(testHistoryFile, history);
//       const messages = await history.getMessages();
      
//       expect(result).toBe(true);
//       expect(messages.length).toBe(1);
//       expect(messages[0].content).toBe('Hello user');
//       expect(logger.info).toHaveBeenCalledWith(`Loaded chat history from ${testHistoryFile}`);
//     });

//     test('should load AI messages correctly', async () => {
//       const mockData: HistoryData = {
//         messages: [{ type: 'ai', data: 'Hello AI' }]
//       };
//       setupFileMocks(mockData);
      
//       const result = loadHistory(testHistoryFile, history);
//       const messages = await history.getMessages();
      
//       expect(result).toBe(true);
//       expect(messages.length).toBe(1);
//       expect(messages[0].content).toBe('Hello AI');
//     });

//     test('should ignore system messages', async () => {
//       const mockData: HistoryData = {
//         messages: [
//           { type: 'system', data: 'System message' },
//           { type: 'user', data: 'User message' }
//         ]
//       };
//       setupFileMocks(mockData);
      
//       const result = loadHistory(testHistoryFile, history);
//       const messages = await history.getMessages();
      
//       expect(result).toBe(true);
//       expect(messages.length).toBe(1);
//       expect(messages[0].content).toBe('User message');
//     });

//     test('should log error and return false on invalid JSON', () => {
//       vi.spyOn(fs, 'existsSync').mockReturnValue(true);
//       vi.spyOn(fs, 'readFileSync').mockReturnValue('invalid json');
      
//       const result = loadHistory(testHistoryFile, history);
      
//       expect(result).toBe(false);
//       expect(logger.error).toHaveBeenCalled();
//     });

//     test('should log error and return false on file read error', () => {
//       vi.spyOn(fs, 'existsSync').mockReturnValue(true);
//       vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
//         throw new Error('Read error');
//       });
      
//       const result = loadHistory(testHistoryFile, history);
      
//       expect(result).toBe(false);
//       expect(logger.error).toHaveBeenCalled();
//     });
//   });

//   describe('saveHistory()', () => {
//     test('should save user messages correctly', async () => {
//       const writeFileSyncSpy = vi.spyOn(fs, 'writeFileSync');
//       history.addUserMessage('Test user message');
      
//       await saveHistory(testHistoryFile, history);
      
//       const content = writeFileSyncSpy.mock.calls[0][1] as string;
//       const writtenData = JSON.parse(content) as HistoryData;
//       expect(writtenData.messages).toEqual([
//         { type: 'user', data: 'Test user message' }
//       ]);
//     });

//     test('should save AI messages correctly', async () => {
//       const writeFileSyncSpy = vi.spyOn(fs, 'writeFileSync');
//       history.addAIMessage('Test AI message');
      
//       await saveHistory(testHistoryFile, history);
      
//       const content = writeFileSyncSpy.mock.calls[0][1] as string;
//       const writtenData = JSON.parse(content) as HistoryData;
//       expect(writtenData.messages).toEqual([
//         { type: 'ai', data: 'Test AI message' }
//       ]);
//     });

//     test('should save system messages with type "system"', async () => {
//       const writeFileSyncSpy = vi.spyOn(fs, 'writeFileSync');
//       history.addMessage(new SystemMessage('Test system message'));
      
//       await saveHistory(testHistoryFile, history);
      
//       const content = writeFileSyncSpy.mock.calls[0][1] as string;
//       const writtenData = JSON.parse(content) as HistoryData;
//       expect(writtenData.messages).toEqual([
//         { type: 'system', data: 'Test system message' }
//       ]);
//     });

//     test('should handle unknown message types', async () => {
//       const writeFileSyncSpy = vi.spyOn(fs, 'writeFileSync');
//       history.addMessage({ _getType: () => 'custom', content: 'Custom message' } as any);
      
//       await saveHistory(testHistoryFile, history);
      
//       const content = writeFileSyncSpy.mock.calls[0][1] as string;
//       const writtenData = JSON.parse(content) as HistoryData;
//       expect(writtenData.messages).toEqual([
//         { type: 'unknown', data: JSON.stringify({ content: 'Custom message' }) }
//       ]);
//     });

//     test('should handle write errors', async () => {
//       const errorSpy = vi.spyOn(logger, 'error');
//       vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
//         throw new Error('Write error');
//       });
      
//       history.addUserMessage('Test message');
      
//       await expect(saveHistory(testHistoryFile, history)).rejects.toThrow();
//       expect(errorSpy).toHaveBeenCalledWith('Error saving chat history: Error: Write error');
//     });
//   });

//   function setupFileMocks(data: HistoryData) {
//     vi.spyOn(fs, 'existsSync').mockReturnValue(true);
//     vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(data));
//   }
// });
