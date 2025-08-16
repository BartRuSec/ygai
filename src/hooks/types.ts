import { HookConfig, ResolvedPromptConfig } from '../config/schema';
import { FileContext } from '../file-handlers';

/**
 * Context passed to hook functions
 */
export interface HookContext {
  variables: Record<string, any>;
  files?: FileContext[];
  userInput: string; // Always available, even if empty string
  response?: string; // Only available in post hooks
  promptConfig: ResolvedPromptConfig; // Full prompt configuration for preprocessing
  metadata: {
    promptName: string;
    model: string;
    timestamp: Date;
  };
}

/**
 * Hook execution result
 */
export interface HookResult {
  context: HookContext;
  success: boolean;
  error?: string;
}

/**
 * Hook function signature
 */
export type HookFunction = (context: HookContext) => HookContext | Promise<HookContext>;
