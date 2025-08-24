import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import chalk from 'chalk';

/**
* Centralized markdown formatting function
* Configures marked with terminal rendering
*/
export const formatMarkdown = async (content: string): Promise<string> => {
    try {
        marked.use(markedTerminal({
            width: process.stdout.columns || 80,
            reflowText: true,
            tabWidth: 2,
            
        }));

        //Fix for line formatting in lists
        // We override list and listitem to preserve original bullets and numbering
        marked.use({
            renderer: {
                list(token) {
                    
                    let index = 0;
                    return token.items.map(item => {
                        
                        (item as any)._index = index++;
                        (item as any)._parentOrdered = token.ordered;
                        (item as any)._parentStart = token.start ?? 1;
                        return this.listitem(item);
                    }).join('');
                },
                listitem(item) {
                    // Teraz mamy tylko jeden argument, ale możemy odczytać index z _index
                    const idx = (item as any)._index as number;
                    const ordered = (item as any)._parentOrdered as boolean;
                    const start = (item as any)._parentStart as number;
                    
                    const bullet = ordered ? `${start + idx}. ` : '- ';
                    
                    // Obcinamy bullet z raw
                    const rawContent = item.raw.slice(bullet.length);
                    
                    // Inline tokens
                    const inlineTokens = marked.Lexer.lexInline(rawContent);
                    const inner = inlineTokens.map(tok => {
                        const fn = (this as any)[tok.type];
                        return fn ? fn.call(this, tok) : tok.raw;
                    }).join('');
                    
                    return bullet + inner + '\n';
                }
            }
        });
        
        return await marked(content);
    } catch (error) {
        // Fallback to raw content on parsing error
        return content;
    }
};