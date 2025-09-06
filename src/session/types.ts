/**
 * Types for session management - minimal interfaces leveraging LangGraph types
 */

export interface SessionSummary {
  threadId: string;
  messageCount: number;
  lastActivity: Date;
}

export interface SessionList {
  database: 'local' | 'global';
  databasePath: string;
  sessions: SessionSummary[];
  totalSessions: number;
  totalMessages: number;
}

export interface SessionDetail extends SessionSummary {
  database: 'local' | 'global';
  databasePath: string;
  created: Date;
  messages: Array<{
    type: string; // From message.getType()
    content: string;
    timestamp: Date;
  }>;
}

export interface CheckpointList {
  sessionName: string;
  database: 'local' | 'global';
  databasePath: string;
  checkpoints: Array<{
    id: string;
    timestamp: Date;
    messageCount: number;
  }>;
}