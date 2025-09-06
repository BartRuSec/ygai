/**
 * Session Service - Uses proper LangGraph types and methods
 */

import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite';
import { BaseMessage } from '@langchain/core/messages';
import { getConversationsDbPath, fileExists } from '../utils/file';
import { SelectiveSaver } from '../workflows/savers';
import logger from '../utils/logger';
import fs from 'fs';
import { SessionList, SessionSummary, SessionDetail, CheckpointList } from './types';

export class SessionService {
  
  /**
   * Create checkpointer for the specified database (only if it exists)
   */
  private createCheckpointer(useGlobal: boolean): SelectiveSaver | null {
    const dbPath = getConversationsDbPath(useGlobal);
    
    // Check if database file exists - don't create it
    if (!fileExists(dbPath)) {
      logger.debug(`Database does not exist at ${dbPath}`);
      return null;
    }

    try {
      //const db = new Database(dbPath);
      const sqliteSaver =  SqliteSaver.fromConnString(dbPath)
    ;
      
      return new SelectiveSaver(sqliteSaver, {
        checkpointNodes: ['output'],
        verbose: false
      });
    } catch (error) {
      logger.debug(`Error opening database at ${dbPath}:`, error);
      return null;
    }
  }

  /**
   * Extract thread IDs from checkpointer using proper LangGraph types
   */
  private async extractThreadIds(checkpointer: SelectiveSaver): Promise<Map<string, { messageCount: number, lastActivity: Date }>> {
    const threadMap = new Map<string, { messageCount: number, lastActivity: Date }>();
    
    try {
      const checkpointGenerator = checkpointer.list({ configurable: {} });
      
      for await (const checkpointTuple of checkpointGenerator) {
        const threadId = checkpointTuple.config.configurable?.thread_id;
        if (!threadId) continue;
        
        const messages = checkpointTuple.checkpoint?.channel_values?.messages || [];
        const messageCount = Array.isArray(messages) ? messages.length : 0;
        const timestamp = new Date(checkpointTuple.checkpoint.ts);
        
        // Keep the latest activity for each thread
        const existing = threadMap.get(threadId);
        if (!existing || timestamp > existing.lastActivity) {
          threadMap.set(threadId, {
            messageCount,
            lastActivity: timestamp
          });
        }
      }
    } catch (error) {
      logger.debug('Error extracting thread IDs:', error);
    }
    
    return threadMap;
  }

  /**
   * List all sessions
   */
  async listSessions(useGlobal: boolean = false): Promise<SessionList> {
    const databasePath = getConversationsDbPath(useGlobal);
    const database = useGlobal ? 'global' : 'local';
    
    const checkpointer = this.createCheckpointer(useGlobal);
    if (!checkpointer) {
      return {
        database,
        databasePath,
        sessions: [],
        totalSessions: 0,
        totalMessages: 0
      };
    }
    
    const threadMap = await this.extractThreadIds(checkpointer);
    
    const sessions: SessionSummary[] = Array.from(threadMap.entries())
      .map(([threadId, info]) => ({
        threadId,
        messageCount: info.messageCount,
        lastActivity: info.lastActivity
      }))
      .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
    
    const totalMessages = sessions.reduce((sum, session) => sum + session.messageCount, 0);
    
    return {
      database,
      databasePath,
      sessions,
      totalSessions: sessions.length,
      totalMessages
    };
  }

  /**
   * Get detailed session information using proper LangGraph methods
   */
  async getSessionDetail(sessionName: string = 'default', useGlobal: boolean = false, checkpointId?: string): Promise<SessionDetail | null> {
    const checkpointer = this.createCheckpointer(useGlobal);
    if (!checkpointer) {
      return null;
    }

    try {
      const config = { configurable: { thread_id: sessionName } };
      let checkpointTuple;

      if (checkpointId) {
        // Get specific checkpoint by searching through checkpoints
        const checkpointGenerator = checkpointer.list(config);
        for await (const tuple of checkpointGenerator) {
          if (tuple.checkpoint.id === checkpointId) {
            checkpointTuple = tuple;
            break;
          }
        }
      } else {
        // Get latest checkpoint
        checkpointTuple = await checkpointer.getTuple(config);
      }
      
      if (!checkpointTuple) {
        return null;
      }

      const messages = checkpointTuple.checkpoint?.channel_values?.messages || [];
      const messageData: Array<{ type: string; content: string; timestamp: Date }> = [];
      
      // Use proper BaseMessage methods
      if (Array.isArray(messages)) {
        for (const msg of messages) {
          if (msg instanceof BaseMessage) {
            messageData.push({
              type: msg.getType().toUpperCase(), // Proper LangGraph method
              content: msg.content?.toString() || '', // Proper content access
              timestamp: new Date(checkpointTuple.checkpoint.ts)
            });
          }
        }
      }

      return {
        threadId: sessionName,
        database: useGlobal ? 'global' : 'local',
        databasePath: getConversationsDbPath(useGlobal),
        messageCount: messageData.length,
        created: new Date(checkpointTuple.checkpoint.ts),
        lastActivity: new Date(checkpointTuple.checkpoint.ts),
        messages: messageData
      };
    } catch (error) {
      logger.debug(`Error getting session detail for ${sessionName}:`, error);
      return null;
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionName: string = 'default', useGlobal: boolean = false): Promise<boolean> {
    const checkpointer = this.createCheckpointer(useGlobal);
    if (!checkpointer) {
      return false;
    }

    try {
      await checkpointer.deleteThread(sessionName);
      return true;
    } catch (error) {
      logger.debug(`Error deleting session ${sessionName}:`, error);
      return false;
    }
  }

  /**
   * List checkpoints for a session using proper LangGraph metadata
   */
  async listCheckpoints(sessionName: string = 'default', useGlobal: boolean = false): Promise<CheckpointList | null> {
    const checkpointer = this.createCheckpointer(useGlobal);
    if (!checkpointer) {
      return null;
    }

    try {
      const config = { configurable: { thread_id: sessionName } };
      const checkpoints: Array<{
        id: string;
        timestamp: Date;
        step:number;
        messageCount: number;
      }> = [];
      
      const checkpointGenerator = checkpointer.list(config);
      
      for await (const checkpointTuple of checkpointGenerator) {
        const messages = checkpointTuple.checkpoint?.channel_values?.messages || [];
        
        const messageCount = Array.isArray(messages) ? messages.length : 0;
        
        checkpoints.push({
          id: checkpointTuple.checkpoint.id,
          step: checkpointTuple.metadata?.step ?? 0, // Proper metadata access
          timestamp: new Date(checkpointTuple.checkpoint.ts),
          //source: checkpointTuple.metadata?.source || 'loop', // Proper metadata access
          messageCount
        });
      }
      
      // Sort by step (descending - newest first)
      checkpoints.sort((a, b) => b.step - a.step);
      
      return {
        sessionName,
        database: useGlobal ? 'global' : 'local',
        databasePath: getConversationsDbPath(useGlobal),
        checkpoints
      };
    } catch (error) {
      logger.debug(`Error listing checkpoints for ${sessionName}:`, error);
      return null;
    }
  }

  /**
   * Check if a session exists
   */
  async sessionExists(sessionName: string = 'default', useGlobal: boolean = false): Promise<boolean> {
    const detail = await this.getSessionDetail(sessionName, useGlobal);
    return detail !== null;
  }


  /**
   * Delete all conversation data
   */
  async deleteAllData(useGlobal: boolean = false): Promise<boolean> {
    const dbPath = getConversationsDbPath(useGlobal);
    
    if (!fileExists(dbPath)) {
      return true; // No database exists, nothing to delete
    }

    try {
      fs.unlinkSync(dbPath);
      logger.debug(`Deleted conversations database at ${dbPath}`);
      return true;
    } catch (error) {
      logger.debug(`Error deleting conversations database at ${dbPath}:`, error);
      return false;
    }
  }
}