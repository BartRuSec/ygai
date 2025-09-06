/**
 * Template renderer using Mustache - part of UI module
 */

import Mustache from 'mustache';
import { SessionList, SessionDetail, CheckpointList } from '../session/types';
import { SESSION_LIST_TEMPLATE, SESSION_DETAIL_TEMPLATE, CHECKPOINT_LIST_TEMPLATE } from './templates';
import { getOutputFormatting, formatOutput } from '.';

/**
 * Base template renderer
 */
export const renderTemplate = (template: string, data: any): string => {
  return Mustache.render(template, data);
};

/**
 * Helper to output markdown with proper formatting
 */
const outputFormatted = async (markdown: string): Promise<void> => {
  const formatting = getOutputFormatting('markdown');
  const output = await formatOutput(markdown, formatting.shouldFormatMarkdown);
  console.log(output);
};

/**
 * Output session list - handles both plain and formatted output
 */
export const outputSessionList = async (sessionList: SessionList, forcePlain?: boolean): Promise<void> => {
  if (process.stdout.isTTY && !forcePlain) {
    // Terminal - formatted table
    const data = {
      ...sessionList,
      sessions: sessionList.sessions.map(session => ({
        ...session,
        formattedLastActivity: formatDate(session.lastActivity)
      }))
    };
    const markdown = renderTemplate(SESSION_LIST_TEMPLATE, data);
    await outputFormatted(markdown);
  } else {
    // Piped - plain 3-column format like ls
    sessionList.sessions.forEach(session => {
      const timestamp = formatDate(session.lastActivity);
      const count = session.messageCount.toString().padStart(3, ' ');
      console.log(`${timestamp}\t${count}\t${session.threadId}`);
    });
  }
};

/**
 * Output session detail - handles both plain and formatted output
 */
export const outputSessionDetail = async (sessionDetail: SessionDetail): Promise<void> => {
  const data = {
    ...sessionDetail,
    formattedCreated: formatDate(sessionDetail.created),
    formattedLastActivity: formatDate(sessionDetail.lastActivity),
    duration: formatDuration(sessionDetail.created, sessionDetail.lastActivity)
  };

  const markdown = renderTemplate(SESSION_DETAIL_TEMPLATE, data);
  await outputFormatted(markdown);
};

/**
 * Output checkpoint list - handles both plain and formatted output
 */
export const outputCheckpointList = async (checkpointList: CheckpointList, forcePlain?: boolean): Promise<void> => {
  if (process.stdout.isTTY && !forcePlain) {
    // Terminal - formatted table
    const data = {
      ...checkpointList,
      checkpoints: checkpointList.checkpoints.map(checkpoint => ({
        ...checkpoint,
        shortId: checkpoint.id.substring(0, 8) + '...',
        formattedTimestamp: formatDate(checkpoint.timestamp)
      }))
    };
    const markdown = renderTemplate(CHECKPOINT_LIST_TEMPLATE, data);
    await outputFormatted(markdown);
  } else {
    // Piped - plain 3-column format like ls
    checkpointList.checkpoints.forEach(checkpoint => {
      const timestamp = formatDate(checkpoint.timestamp);
      const count = checkpoint.messageCount.toString().padStart(3, ' ');
      console.log(`${timestamp}\t${count}\t${checkpoint.id}`);
    });
  }
};

/**
 * Format date like ls command
 */
const formatDate = (date: Date): string => {
  const now = new Date();
  const isCurrentYear = date.getFullYear() === now.getFullYear();
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const day = date.getDate().toString().padStart(2, ' ');
  const month = months[date.getMonth()];
  
  if (isCurrentYear) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day} ${month} ${hours}:${minutes}`;
  } else {
    const year = date.getFullYear();
    return `${day} ${month}  ${year}`;
  }
};

/**
 * Format duration between two dates
 */
const formatDuration = (start: Date, end: Date): string => {
  const diffMs = end.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffMins < 60) return `${diffMins} minutes`;
  if (diffHours < 24) return `${diffHours} hours`;
  return `${diffDays} days`;
};