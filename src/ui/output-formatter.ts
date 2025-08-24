import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';

/**
 * Centralized markdown formatting function
 * Configures marked with terminal rendering
 */
export const formatMarkdown = async (content: string): Promise<string> => {
    try {
        // Configure marked for terminal output
        marked.use(markedTerminal());
        return await marked(content);
    } catch (error) {
        // Fallback to raw content on parsing error
        return content;
    }
};