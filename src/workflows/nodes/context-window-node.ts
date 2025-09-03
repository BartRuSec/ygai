/**
 * Context Window Node - Limits chat history using LangChain's native trimMessages
 * 
 * This node manages the total context window by considering both:
 * 1. Conversation history (persistent, saved to database)
 * 2. File messages (ephemeral, not saved to history)
 * 
 * The approach:
 * - Uses 80% of model's total capacity for all context (history + files + user input)
 * - Calculates tokens used by file messages (ephemeral context)
 * - Allocates remaining budget to conversation history
 * - Trims history to fit within budget, preserving most recent messages
 * - Ensures at least 25% of budget is always available for history
 * 
 * This ensures the LLM gets both file context AND conversation history
 * without exceeding the model's context window limits.
 */

import { trimMessages } from '@langchain/core/messages';
import { WorkflowState, WorkflowRuntimeConfig, LangGraphNode } from '../types';
import { getModelLimits, calculateInputBudget } from '../../utils/model/limits';
import { countMessageTokens } from '../../utils/model/tokens';
import { updateLoadingStage } from '../../ui';
import logger from '../../utils/logger';

/**
 * Creates the context window node that trims conversation history
 * to fit within model capacity, reserving 20% for user input and files
 */
export const createContextWindowNode = (): LangGraphNode => {
  return async (
    state: WorkflowState, 
    config: { configurable: WorkflowRuntimeConfig }
  ): Promise<Partial<WorkflowState>> => {
    try {
      const { executionConfig, transientData } = config.configurable;
      
      // Mark current node for selective checkpointing
      transientData.currentNodeName = 'context_window';
      const modelConfig = executionConfig.model;
      
      // Get current messages from state
      const messages = state.messages || [];
      
      // If no history, nothing to trim
      if (messages.length === 0) {
        logger.debug('No history messages to trim');
        return {};
      }
      
      updateLoadingStage('Optimizing context window...');
      
      // Get model limits
      const limits = getModelLimits(modelConfig.model, {
        contextWindow: modelConfig.contextWindow,
        maxOutputTokens: modelConfig.maxOutputTokens
      });
      
      // Calculate total available capacity (80% of model capacity)
      // Reserve 20% for user input, system prompts, and response generation
      const totalCapacity = limits.contextWindow;
      const usableCapacityRatio = 0.8; // Use 80% for all context (history + files)
      const usableCapacity = Math.floor(totalCapacity * usableCapacityRatio);
      
      // Reserve tokens for output and system overhead
      const totalBudget = calculateInputBudget(
        usableCapacity,
        limits.maxOutputTokens || 4096,
        100 // System overhead
      );
      
      // Get file messages and calculate their token usage
      const fileMessages = transientData.fileMessages || [];
      const fileTokens = fileMessages.length > 0 
        ? countMessageTokens(fileMessages, modelConfig.model)
        : 0;
      
      // The history budget is what's left after accounting for file messages
      // But ensure we always reserve some space for history (at least 25% of total budget)
      const minHistoryBudget = Math.floor(totalBudget * 0.25);
      const historyBudget = Math.max(
        totalBudget - fileTokens,
        minHistoryBudget
      );
      
      logger.debug(
        `Context window budget calculation:`,
        `\n  Model capacity: ${totalCapacity} tokens`,
        `\n  Usable capacity (80%): ${usableCapacity} tokens`,
        `\n  Total budget (after output/overhead): ${totalBudget} tokens`,
        `\n  File tokens: ${fileTokens} tokens`,
        `\n  Min history budget (25%): ${minHistoryBudget} tokens`,
        `\n  Actual history budget: ${historyBudget} tokens`
      );
      
      // Calculate current token usage before trimming
      const originalTokens = countMessageTokens(messages, modelConfig.model);
      const currentTotalTokens = originalTokens + fileTokens;
      
      logger.debug(
        `Before trimming: ${originalTokens} history tokens + ${fileTokens} file tokens = ${currentTotalTokens} total tokens ` +
        `(${Math.round(currentTotalTokens/totalCapacity*100)}% of ${totalCapacity} model capacity)`
      );
      
      // Only trim if we actually exceed the budget
      if (currentTotalTokens <= totalBudget) {
        logger.debug('Context window within limits, no trimming needed');
        return {};
      }
      
      // Create token counter function for trimMessages
      const tokenCounter = (msgs: typeof messages) => {
        return countMessageTokens(msgs, modelConfig.model);
      };
      
      // Apply LangChain's native trimMessages with optimized settings
      const trimmedMessages = await trimMessages(messages, {
        maxTokens: historyBudget,
        tokenCounter,
        strategy: 'last', // Keep most recent messages
        includeSystem: true, // Preserve system messages
        startOn: 'human', // Ensure conversation starts properly
        endOn: ['human', 'tool'], // End on human or tool messages for proper flow
        allowPartial: false // Keep complete messages only
      });
      
      // Apply trimming
      const trimmedTokens = countMessageTokens(trimmedMessages, modelConfig.model);
      const finalTotalTokens = trimmedTokens + fileTokens;
      
      // Check if the final result still exceeds model capacity
      if (finalTotalTokens > totalBudget) {
        const excessTokens = finalTotalTokens - totalBudget;
        const capacityPercent = Math.round(finalTotalTokens / totalCapacity * 100);
        
        throw new Error(
          `Context window overflow: Total context (${finalTotalTokens} tokens, ${capacityPercent}% of model capacity) ` +
          `exceeds budget (${totalBudget} tokens) by ${excessTokens} tokens. ` +
          `File messages: ${fileTokens} tokens, Trimmed history: ${trimmedTokens} tokens. ` +
          `Consider reducing file sizes or using a model with larger context window.`
        );
      }
      
      logger.info(
        `Trimmed conversation history from ${messages.length} to ${trimmedMessages.length} messages ` +
        `(${originalTokens} → ${trimmedTokens} tokens) to fit model capacity`
      );
      
      // Return only trimmed conversation history, NOT fileMessages
      // fileMessages remain in transientData for LLM context only
      return {
        messages: trimmedMessages
      };
      
    } catch (error) {
      logger.debug('Context window node failed:', error);
      throw error;
    }
  };
};