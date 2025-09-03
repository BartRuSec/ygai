/**
 * Workflow utility functions
 */

/**
 * Generate workflow ID
 */
export const generateWorkflowId = (): string => {
  return `workflow_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};