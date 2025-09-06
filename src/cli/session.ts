/**
 * Session management CLI commands
 */

import { Command } from 'commander';
import { SessionService } from '../session/session-service';
import { outputSessionList, outputSessionDetail, outputCheckpointList } from '../ui/session-renderer';
import logger from '../utils/logger';

const sessionService = new SessionService();

/**
 * Configure session management commands
 */
export const configureSessionCommand = (program: Command): Command => {
  const sessionCommand = program
    .command('session')
    .alias("s")
    .description('Manage conversation sessions');

  // List sessions
  sessionCommand
    .command('list')
    .alias('ls')
    .description('List all conversation sessions')
    .option('-g, --global', 'List global sessions instead of local')
    .option('--plain', 'Output plain text without formatting')
    .action(async (options) => {
      try {
        const sessionList = await sessionService.listSessions(options.global);
        await outputSessionList(sessionList, options.plain);
      } catch (error) {
        logger.error(`Error listing sessions: ${error}`);
        process.exit(1);
      }
    });

  // Show session detail
  sessionCommand
    .command('show [name]')
    .description('Show detailed information about a session (default: "default")')
    .option('-g, --global', 'Show global session instead of local')
    .option('--checkpoint <id>', 'Show session from specific checkpoint ID')
    .action(async (name, options) => {
      try {
        const sessionName = name || 'default';
        const sessionDetail = await sessionService.getSessionDetail(sessionName, options.global, options.checkpoint);
        
        if (!sessionDetail) {
          const message = options.checkpoint 
            ? `Session '${sessionName}' or checkpoint '${options.checkpoint}' not found.`
            : `Session '${sessionName}' not found.`;
          console.log(message);
          process.exit(0);
        }
        
        await outputSessionDetail(sessionDetail);
      } catch (error) {
        logger.error(`Error showing session: ${error}`);
        process.exit(1);
      }
    });

  // Delete session
  sessionCommand
    .command('delete [name]')
    .alias('rm')
    .description('Delete a conversation session (default: "default")')
    .option('-g, --global', 'Delete global session instead of local')
    .action(async (name, options) => {
      try {
        const sessionName = name || 'default';
        const success = await sessionService.deleteSession(sessionName, options.global);
        
        if (success) {
          console.log(`✅ Session '${sessionName}' deleted successfully.`);
        } else {
          console.log(`Session '${sessionName}' not found.`);
        }
      } catch (error) {
        logger.error(`Error deleting session: ${error}`);
        process.exit(1);
      }
    });

  // List checkpoints
  sessionCommand
    .command('checkpoints [name]')
    .description('List checkpoints for a session (default: "default")')
    .option('-g, --global', 'Show global session checkpoints instead of local')
    .option('--plain', 'Output plain text without formatting')
    .action(async (name, options) => {
      try {
        const sessionName = name || 'default';
        const checkpointList = await sessionService.listCheckpoints(sessionName, options.global);
        
        if (!checkpointList) {
          console.log(`Session '${sessionName}' not found.`);
          process.exit(0);
        }
        
        await outputCheckpointList(checkpointList, options.plain);
      } catch (error) {
        logger.error(`Error listing checkpoints: ${error}`);
        process.exit(1);
      }
    });


  // Delete all conversation data
  sessionCommand
    .command('clear')
    .description('Delete all conversation data')
    .option('-g, --global', 'Clear global conversations instead of local')
    .action(async (options) => {
      try {
        const success = await sessionService.deleteAllData(options.global);
        
        if (success) {
          const location = options.global ? 'global' : 'local';
          console.log(`✅ All ${location} conversation data deleted successfully.`);
        } else {
          console.log(`❌ Failed to delete conversation data.`);
        }
      } catch (error) {
        logger.error(`Error clearing conversation data: ${error}`);
        process.exit(1);
      }
    });

  return sessionCommand;
};