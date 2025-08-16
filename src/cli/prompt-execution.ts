import { AIMessage } from "@langchain/core/messages";
import { createAndFormatChatPrompt, getModelProvider } from "../models";
import { PromptExecutionOptions } from "./prompt-params"
import logger from "../utils/logger";
import { HistoryManager } from "../history";
import { executeHook, HookContext } from "../hooks";


export const executePrompt = async (executionOptions: PromptExecutionOptions,isHistory:boolean=false): Promise<void> => {

    const modelProvider = await getModelProvider(executionOptions.model);
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
        const response = await modelProvider.generate(messages,stream);
    
        // Stream response
        let fullResponse = '';
    
        if (stream && typeof response !== 'string') {
            for await (const chunk of response) {
                process.stdout.write(chunk);
                fullResponse += chunk;
            }
        } else if (typeof response === 'string') {
            process.stdout.write(response)
            fullResponse = response;
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
    }
}
