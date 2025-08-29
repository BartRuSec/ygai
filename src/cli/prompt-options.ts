import { Command } from 'commander';


/**
 * Creates a base command with common options
 * @param program The Commander program instance
 * @returns The configured command with common options
 */
export const addCommonPromptOptions = (program: Command): Command => {
  const command = program
    .option('-m, --model <name>', 'Use a specific model configuration from config file')
    .option('-f, --file <path>', 'Add file(s) to the context',(value,previous:string[]|undefined)=> {
        return previous ? [...previous,value]:[value]
    })
    .option('--stream', 'Enable streaming of the model response')
    .option('-s, --system-prompt <prompt>', 'Override the system prompt')
    .option('--plain', 'Disable colored output formatting')
    .option('--dry-run', 'Simulate execution without API calls')
    .option('-o, --out <file>', 'Output raw response to file')
    .option('-D, --define <definition>', 'Define template variables', (value, previous = {}) => {
    // Parse the name=value format
    const match = value.match(/^([^=]+)=(.*)$/);
    if (match) {
      return {
        ...previous,
        [match[1]]: match[2]
      };
    }
    return previous;
  }, {})
    .arguments('[promptName] [promptArgs...]')
  return command;
};

