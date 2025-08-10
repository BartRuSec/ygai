import { AIMessage } from "@langchain/core/messages";
import { createAndFormatChatPrompt, getModelProvider } from "../models";
import { PromptExecutionOptions } from "./prompt-params"
import logger from "../utils/logger";
import { HistoryManager } from "../history";


export const executePrompt = async (executionOptions: PromptExecutionOptions,isHistory:boolean=false): Promise<void> => {

    const modelProvider = await getModelProvider(executionOptions.model);
    if (!modelProvider) {
        throw new Error(`Model provider not found for model: ${executionOptions.model.name}`);
    }
    const {
        model,        
        promptConfig,
        variables,
        files,
        stream
    } = executionOptions;
    try {

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