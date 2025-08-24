import { AIMessage } from "@langchain/core/messages";
import { createAndFormatChatPrompt, getModelProvider } from "../models";
import { PromptExecutionOptions } from "./prompt-params"
import logger from "../utils/logger";
import { HistoryManager } from "../history";
import { executeHook, HookContext } from "../hooks";
import { formatMarkdown, createLoadingIndicator } from "../ui";
import { determineOutputFormatting } from "../utils/color-detection";


export const executePrompt = async (executionOptions: PromptExecutionOptions,isHistory:boolean=false): Promise<void> => {

    // Extract MCP server names from prompt config - only if they exist
    const mcpServerNames = executionOptions.promptConfig?.mcp 
      ? (Array.isArray(executionOptions.promptConfig.mcp) 
          ? executionOptions.promptConfig.mcp 
          : [executionOptions.promptConfig.mcp])
      : [];
    
    // Only pass MCP servers if they are actually configured (performance optimization)
    const modelProvider = await getModelProvider(
      executionOptions.model, 
      mcpServerNames.length > 0 ? mcpServerNames : undefined
    );
    if (!modelProvider) {
        throw new Error(`Model provider not found for model: ${executionOptions.model.name}`);
    }
    
    let {
        model,        
        promptConfig,
        variables,
        files,
        stream,
        userInput,
        promptName
    } = executionOptions;
    
    try {
        // Execute pre-hook if configured
        if (promptConfig?.pre) {
            const hookContext: HookContext = {
                variables: { ...variables },
                files,
                userInput: userInput || '',
                promptConfig,
                metadata: {
                    promptName: promptName || 'unknown',
                    model: model.model,
                    timestamp: new Date()
                }
            };
            
            const updatedContext = await executeHook(promptConfig.pre, hookContext);
            
            // Update execution options with hook results
            variables = updatedContext.variables;
            promptConfig = updatedContext.promptConfig;
            
            logger.debug('Pre-hook executed successfully');
        }

        let history:HistoryManager|undefined=undefined
        if (isHistory) {
            history=HistoryManager.loadHistory();
        }
        
        const {messages,historyMessages}=await createAndFormatChatPrompt( promptConfig.system,promptConfig.user, variables, files,history );
        
        // Determine output formatting based on user preferences and terminal capabilities
        const formatting = determineOutputFormatting(executionOptions.output);
        
        // Initialize loading indicator only if it should be shown
        const loadingIndicator = formatting.shouldShowLoadingIndicator ? createLoadingIndicator({
            message: 'Invoking model...',
            showTokenCount: true
        }) : null;

        // Start loading indicator if available
        loadingIndicator?.start();

        // Stream response
        let fullResponse = '';

        try {
            const response = await modelProvider.generate(
                messages,
                stream,
                // Token update callback for real-time token counting (only if indicator exists)
                (tokenCount: number) => {
                    loadingIndicator?.updateTokenCount(tokenCount);
                }
            );
            
            // Stop loading indicator before processing response
            loadingIndicator?.stop();
        
            if (stream && typeof response !== 'string') {
                // Stream output directly without formatting
                for await (const chunk of response) {
                    process.stdout.write(chunk);
                    fullResponse += chunk;
                }
            } else if (typeof response === 'string') {
                // Format non-streaming output if needed
                const formattedResponse = formatting.shouldFormatMarkdown 
                    ? await formatMarkdown(response)
                    : response;
                process.stdout.write(formattedResponse);
                fullResponse = response;
            }
        } catch (generateError) {
            // Ensure loading indicator is stopped on error
            loadingIndicator?.stop();
            throw generateError;
        }

        // Execute post-hook if configured
        if (promptConfig?.post) {
            const hookContext: HookContext = {
                variables,
                files,
                userInput: userInput || '',
                response: fullResponse,
                promptConfig,
                metadata: {
                    promptName: promptName || 'unknown',
                    model: model.model,
                    timestamp: new Date()
                }
            };
            
            await executeHook(promptConfig.post, hookContext);
            logger.debug('Post-hook executed successfully');
        }

        if (isHistory) {
            historyMessages.push(new AIMessage(fullResponse));
            history.addHistoryEntry(model.model,historyMessages, files ? files.map((value)=>value.filePath):undefined);
            logger.debug("Saving history:",history.get())
            history.saveHistory()
        }

    } catch (error) {
        throw new Error(`Error executing prompt: ${error.message}`);
    } finally {
        // Cleanup MCP resources
        if (modelProvider?.cleanup) {
            await modelProvider.cleanup();
        }
    }
}
