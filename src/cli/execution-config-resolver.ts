/**
 * Functional approach to resolve CLI options into ExecutionConfig
 * Replaces the ExecutionConfigResolver class with a simple pipeline
 */

import { Config, ResolvedPromptConfig, HookConfig, HookReference, HookDefinition } from '../config/schema';
import { ExecutionConfig } from '../workflows/types';
import { CliOptions } from './prompt-options';
import { getModelConfig, getPromptConfig } from '../config';
import { resolvePrompts, PromptResolutionError } from '../models';


/**
 * Main resolver function - transforms CLI options to ExecutionConfig
 */
export const resolveExecutionConfig = (
  config: Config,
  options: CliOptions,
  promptName?: string,
  promptArgs: string[] = [],
  stdinContent?: string
): ExecutionConfig => {
  
  // Step 1: Resolve prompt config and extract validity flag
  const { promptConfig, isPromptNameProvided } = resolvePromptConfig(config, promptName, options.define);
  
  // Step 2: Use the validity flag to resolve user input
  const userInput = resolveUserInput(isPromptNameProvided, promptName, promptArgs, stdinContent);
  
  // Step 3: Resolve other dependencies
  const initialVariables = resolveInitialVariables(options.define, userInput, options.session, promptName, getModelConfig(config, options.model || 'default').model);
  
  // Step 4: Resolve hooks from both new and old formats  
  const preHooks = resolveHooks(promptConfig?.pre, config.hooks);
  const postHooks = resolveHooks(promptConfig?.post, config.hooks);
  
  // Step 5: Construct final config with all resolved data
  return {
    model: getModelConfig(config, options.model || 'default'),
    prompt: promptConfig,
    outputFormat: resolveOutputFormat(options, promptConfig),
    enableHistory: !!options.session,
    sessionName: options.session,
    shouldStream: options.stream === undefined ? false : true,
    shouldWriteToFile: !!options.out,
    outputFile: options.out,
    filesToProcess: options.file || [],
    preHooks,
    postHooks,
    mcpServerConfigs: resolveMcpServerConfigs(promptConfig, config),
    dryRun: options.dryRun || false,
    useGlobal: options.global || false,
    initialVariables,
    verbose: options.verbose || false
  };
};

/**
 * Resolve prompt configuration and determine if prompt name was provided
 */
const resolvePromptConfig = (
  config: Config, 
  promptName?: string, 
  defineVars?: Record<string, any>
): { promptConfig?: ResolvedPromptConfig; isPromptNameProvided: boolean } => {
  
  let promptConfig = getPromptConfig(config, promptName);
  const isPromptNameProvided = !!promptConfig;
  
  if (!promptConfig) {
    promptConfig = getPromptConfig(config, 'default');
  }

  if (!promptConfig) {
    return { promptConfig: undefined, isPromptNameProvided };
  }

  // Validate required variables if specified in prompt config  
  if (promptConfig.vars) {
    const providedVars = Object.keys(defineVars || {});
    const missingVars = promptConfig.vars.filter(varName => !providedVars.includes(varName));
    if (missingVars.length > 0) {
      throw new Error(`Missing required variables: ${missingVars.join(', ')}. Use -D<var>=<value> to provide them.`);
    }
  }

  // Resolve file-based prompts (file paths are already resolved in config)
  try {
    const resolvedPrompts = resolvePrompts(promptConfig);
    const resolvedConfig: ResolvedPromptConfig = {
      alias: promptConfig.alias,
      system: resolvedPrompts.system,
      user: resolvedPrompts.user,
      vars: promptConfig.vars,
      pre: promptConfig.pre,
      post: promptConfig.post,
      mcp: promptConfig.mcp,
      output: promptConfig.output
    };
    return { promptConfig: resolvedConfig, isPromptNameProvided };
  } catch (error) {
    if (error instanceof PromptResolutionError) {
      throw new Error(`Prompt resolution failed: ${error.message}`);
    }
    throw error;
  }
};

/**
 * Resolve user input based on prompt config validity
 * Copy logic from prompt-params.ts lines 148-158
 */
const resolveUserInput = (
  isPromptNameProvided: boolean,
  promptName?: string,
  promptArgs: string[] = [],
  stdinContent?: string
): string => {
  let userInput: string | null = null;
  
  // Determine user input based on the promptConfig and arguments
  if (stdinContent) {
    userInput = stdinContent.trim();
  } else if (isPromptNameProvided && promptArgs.length > 0) {
    userInput = promptArgs.join(' ');
  } else if (!isPromptNameProvided && promptName && promptArgs.length === 0) {
    userInput = promptName;
  } else if (!isPromptNameProvided && promptArgs.length > 0) {
    // Fix: Match prompt-params.ts line 157 - missing space between promptName and args
    userInput = promptName ? promptName + ' ' + promptArgs.join(' ') : promptArgs.join(' ');
  }
  
  return userInput || '';
};

/**
 * Resolve output format with priority: --plain CLI option > prompt config output > default 'markdown'
 */
const resolveOutputFormat = (
  options: CliOptions,
  promptConfig?: ResolvedPromptConfig
): 'plain' | 'markdown' => {
  if (options.plain) {
    return 'plain';
  }
  
  if (promptConfig?.output) {
    return promptConfig.output;
  }
  
  return 'markdown';
};

/**
 * Resolve initial variables from options.define and add system variables
 */
const resolveInitialVariables = (
  defineVars?: Record<string, any>,
  userInput?: string,
  sessionName?: string,
  promptName?: string,
  modelName?: string
): Record<string, any> => {
  const baseVariables = defineVars || {};
  
  return {
    ...baseVariables,
    user_input: userInput || '',
    session_name: sessionName,
    timestamp: new Date().toISOString(),
    model_name: modelName,
    prompt_name: promptName || 'default'
  };
};

/**
 * Resolve MCP server configurations from prompt config
 */
const resolveMcpServerConfigs = (promptConfig?: ResolvedPromptConfig, config?: Config): Record<string, any> => {
  const mcpServerConfigs: Record<string, any> = {};
  
  if (!promptConfig?.mcp || !config?.mcp) {
    return mcpServerConfigs;
  }
  
  const mcpServers = Array.isArray(promptConfig.mcp) ? promptConfig.mcp : [promptConfig.mcp];
  
  mcpServers.forEach(serverName => {
    if (config.mcp![serverName]) {
      mcpServerConfigs[serverName] = config.mcp![serverName];
    }
  });
  
  return mcpServerConfigs;
};

/**
 * Resolve hook references to actual HookConfig objects
 * Supports both new format (hook names from central definitions and arrays) and old format (inline configs)
 */
const resolveHooks = (
  hookReferences?: HookReference | HookReference[], 
  centralHooks?: { [key: string]: HookDefinition }
): HookConfig[] => {
  if (!hookReferences) {
    return [];
  }
  
  // Convert single reference to array for uniform processing
  const references = Array.isArray(hookReferences) ? hookReferences : [hookReferences];
  
  return references.map((reference) => {
    if (typeof reference === 'string') {
      // Hook name reference - look up in central definitions
      if (!centralHooks || !centralHooks[reference]) {
        throw new Error(`Hook reference "${reference}" not found in hooks configuration`);
      }
      
      // Convert HookDefinition to HookConfig (same structure)
      const hookDefinition = centralHooks[reference];
      return {
        file: hookDefinition.file,
        function: hookDefinition.function
      };
    } else {
      // Inline hook configuration - use as-is
      return reference as HookConfig;
    }
  });
};