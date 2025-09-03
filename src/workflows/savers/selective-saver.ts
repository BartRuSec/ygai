/**
 * SelectiveSaver - Wrapper that adds selective checkpointing to any BaseCheckpointSaver
 * Uses composition pattern for maximum flexibility with different saver implementations
 */

import { BaseCheckpointSaver, Checkpoint } from '@langchain/langgraph-checkpoint';
import { CheckpointTuple, CheckpointMetadata } from '@langchain/langgraph-checkpoint';
import { RunnableConfig } from '@langchain/core/runnables';
import logger from '../../utils/logger';

export interface SelectiveSaverConfig {
  /** Node names that should trigger checkpoint saves */
  checkpointNodes: string[];
  /** Whether to log checkpoint decisions (default: false) */
  verbose?: boolean;
}

export class SelectiveSaver extends BaseCheckpointSaver {
  private wrappedSaver: BaseCheckpointSaver;
  private config: SelectiveSaverConfig;

  constructor(saver: BaseCheckpointSaver, config: SelectiveSaverConfig) {
    super();
    this.wrappedSaver = saver;
    this.config = config;
    
    if (this.config.verbose) {
      logger.debug(`SelectiveSaver configured for nodes: ${this.config.checkpointNodes.join(', ')}`);
    }
  }

  /**
   * Determine if checkpoint should be saved based on last node visited
   */
  private shouldCheckpoint(config?: RunnableConfig): boolean {
    // Extract last visited node name from newVersions (edge transitions)
    const lastNodeVisited = this.extractLastNodeVisited(config);
    
    if (!lastNodeVisited) {
      // If we can't determine the last visited node, don't checkpoint by default
      if (this.config.verbose) {
        logger.debug('SelectiveSaver: No last visited node detected, skipping checkpoint');
      }
      return false;
    }

    const shouldSave = this.config.checkpointNodes.includes(lastNodeVisited);
    
    if (this.config.verbose) {
      logger.debug(`SelectiveSaver: Last visited node '${lastNodeVisited}' ${shouldSave ? 'WILL' : 'will NOT'} be checkpointed`);
    }
    
    return shouldSave;
  }

  /**
   * Extract last visited node name from newVersions (edge transitions)
   * newVersions contains the nodes that just completed execution
   */
  private extractLastNodeVisited(config?: RunnableConfig): string | null {
    try {
      // Check if current node name is set in transient data
      const currentNodeName = config?.configurable?.transientData?.currentNodeName;
      
      if (currentNodeName && this.config.verbose) {
        logger.debug(`SelectiveSaver: Current node from transientData: '${currentNodeName}'`);
      }
      
      return currentNodeName || null;
    } catch (error) {
      if (this.config.verbose) {
        logger.debug('SelectiveSaver: Error extracting current node from transientData:', error);
      }
      return null;
    }
  }

  /**
   * Get checkpoint - delegate to wrapped saver
   */
  async get(config: RunnableConfig): Promise<Checkpoint | undefined> {
    return this.wrappedSaver.get(config);
  }

  /**
   * Get tuple - delegate to wrapped saver
   */
  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    return this.wrappedSaver.getTuple(config);
  }

  /**
   * List checkpoints - delegate to wrapped saver
   */
  async *list(
    config: RunnableConfig,
    options?: { limit?: number; before?: RunnableConfig }
  ): AsyncGenerator<CheckpointTuple> {
    yield* this.wrappedSaver.list(config, options);
  }

  /**
   * Put checkpoint - only save if current node should be checkpointed
   */
  async put(
    config: RunnableConfig,
    checkpoint: any,
    metadata: CheckpointMetadata,
    newVersions?: Record<string, any>
  ): Promise<RunnableConfig> {
    
    // Only save checkpoint if last visited node is in our checkpoint list
    const shouldSave=this.shouldCheckpoint(config);
    if (shouldSave) {
      return this.wrappedSaver.put(config, checkpoint, metadata, newVersions);
    }
    logger.debug(`[${shouldSave}] Checkpoint for ${JSON.stringify(config)}`)
    // Return config unchanged if not checkpointing
    return config;
  }

  /**
   * Put writes - delegate to wrapped saver (used for intermediate writes)
   */
  async putWrites(
    config: RunnableConfig,
    writes: Array<[string, any]>,
    taskId: string
  ): Promise<void> {
    // For writes, we may want to be more permissive or apply same filtering
    // For now, delegate all writes to maintain functionality
    return this.wrappedSaver.putWrites(config, writes, taskId);
  }

  /**
   * Delete thread - delegate to wrapped saver
   */
  async deleteThread(threadId: string): Promise<void> {
    return this.wrappedSaver.deleteThread(threadId);
  }

  /**
   * Get the wrapped saver instance (useful for direct access if needed)
   */
  getWrappedSaver(): BaseCheckpointSaver {
    return this.wrappedSaver;
  }
}