import { WorkflowState, TransientWorkflowData, ExecutionConfig } from '../workflows/types';

/**
 * Hook function return value - direct variables object to merge into workflow
 */
export type HookResult = Record<string, any>;

/**
 * Hook execution result with metadata
 */
export interface HookExecutionResult {
  result: HookResult;
  success: boolean;
  error?: string;
}

/**
 * Hook function signature - aligned with workflow node pattern
 * @param state Persistent workflow state
 * @param data Transient workflow data (mutable)
 * @param config Optional execution configuration for advanced use cases
 * @returns Object with optional variables to add to workflow
 */
export type HookFunction = (
  state: WorkflowState,
  data: TransientWorkflowData,
  config?: ExecutionConfig
) => HookResult | Promise<HookResult>;
