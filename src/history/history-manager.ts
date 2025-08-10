
import fs from 'fs';
import path from 'path';

import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import logger from '../utils/logger';



export type HistoryMessage = {
    type:string,
    content:string
}

export type HistoryEntry = {
  timestamp: number;
  model: string;
  files?: string[];
  messages: HistoryMessage[]
}

export const toBaseMessage=(message:HistoryMessage)=>{
  switch (message.type) {
    case "system":return new SystemMessage(message.content)
    case "human":return new HumanMessage(message.content)
    case "ai":return new AIMessage(message.content)
  }
}

export type HistoryData = {
  entries: HistoryEntry[];
}

export const getDefaultHistoryPath = (): string => {
  return path.join(process.cwd(), '.ygai-chat');
};


export class HistoryManager {
  private history: HistoryData;

  constructor(historyData?: HistoryData) {
    if (historyData) {
      this.history = historyData;
    } else {    
    this.history = { entries: [] };
  }
}
 
get(){
  return this.history
}
 static  loadHistory (historyFile?: string): HistoryManager | null {
  if (!historyFile) {
      historyFile = getDefaultHistoryPath();
  }
  if (!fs.existsSync(historyFile)) {
    logger.debug('History file do not exists:',historyFile)
    return new HistoryManager();
  }
  logger.debug("Loading history from file:",historyFile)
  try {
    const data = JSON.parse(fs.readFileSync(historyFile, 'utf-8')) as HistoryData;
    return new HistoryManager(data);

    
  } catch (error) {
    logger.error(`Error loading chat history: ${error}`);
    return null;
  }
};

 addHistoryEntry(model: string, entires: BaseMessage[],files?:string[]): void {
  const data:HistoryMessage[]=entires.map(value=>{
      return {
        type:value.getType().toString(),
        content:value.content.toString()
      }
    })
  const entry: HistoryEntry = {
    timestamp: Date.now(),
    model,
    files:files,
    messages:data
  };
  this.history.entries.push(entry);
};

getMessages(): BaseMessage[] {
  return this.history.entries.flatMap(entry => entry.messages.map(value=>toBaseMessage(value)));
}

async saveHistory(historyFile?: string)  {
  try {
   
    if (!historyFile) {
      historyFile = getDefaultHistoryPath();
    }
    
    fs.writeFileSync(historyFile, JSON.stringify(this.history));
  } catch (error) {
    logger.error(`Error saving chat history: ${error}`);
    throw error;
  }
};
};


