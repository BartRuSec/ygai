import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import logger from '../utils/logger';

/**
* Centralized markdown formatting function
* Configures marked with terminal rendering
*/

const nl=["code","table","blockquote","heading","hr"]

export const formatMarkdown = async (content: string): Promise<string> => {
    try {
        marked.use(markedTerminal({
            // width: process.stdout.columns || 80,
            // reflowText: true,
            tabWidth: 2,
            
        }));

        //Fix for line formatting in lists
        // We override list and listitem to preserve original bullets and numbering
        marked.use({
            renderer: {
                list(token) {
                    // Calculate nesting level - if not set, this is top level (0)
                    const currentLevel = (token as any)._nestingLevel ?? 0;
                    // Calculate indentation at list level based on nesting
                    const listIndent = '  '.repeat(currentLevel);
                    
                    let index = 0;
                    const items = token.items.map(item => {
                        (item as any)._index = index++;
                        (item as any)._parentOrdered = token.ordered;
                        (item as any)._parentStart = token.start ?? 1;
                        (item as any)._nestingLevel = currentLevel;
                        (item as any)._listIndent = listIndent;
                        return "\n"+this.listitem(item);
                    });
                    return items.join('');
                },
                listitem(item) {
                    const idx = (item as any)._index as number;
                    const ordered = (item as any)._parentOrdered as boolean;
                    const start = (item as any)._parentStart as number;
                    const nestingLevel = (item as any)._nestingLevel ?? 0;
                    
                    // Use indentation calculated at list level
                    const indent = (item as any)._listIndent || '';
                    
                    // Handle task lists first (they have special checkbox formatting)
                    let bullet: string;
                    if (item.task) {
                        bullet = indent + (item.checked ? '- [x] ' : '- [ ] ');
                    } else {
                        // Try to detect original bullet, but fallback to computed one
                        const bulletMatch = item.raw.match(/^(\s*)([*+-]|\d+[.)])\s*/);
                        const originalBullet = bulletMatch ? bulletMatch[2] : (ordered ? `${start + idx}.` : '-');
                        bullet = indent + originalBullet + ' ';
                    }

                    // Extract content after the original bullet (not our generated bullet)
                    const originalBulletMatch = item.raw.match(/^(\s*)([*+-]|\d+[.)]|\[[x ]\])\s*/i);
                    const originalBulletLength = originalBulletMatch ? originalBulletMatch[0].length : 0;
                    const rawContent = item.raw.slice(originalBulletLength);
                    const inner = item.tokens ? item.tokens.map(tok => {
                        // For nested list tokens, increment the nesting level
                        if (tok.type === 'list') {
                            (tok as any)._nestingLevel = nestingLevel + 1;
                        }
     
                        if (tok.type === 'text'){
                            return marked.Lexer.lexInline(tok.raw).reduce((acc,t)=>{
                                const f = (this as any)[t.type];
                                const content=nl.includes(t.type) ? "\n":""+ (f ? f.call(this, t) : t.raw)
                                return acc+ content.replace(/\n$/, '');
                            },"");
                        }                                
                        const fn = (this as any)[tok.type];
                        const result = fn ? fn.call(this, tok) : tok.raw;
                       
                        if (nl.includes(tok.type))
                            return "\n" + result;                        
                        return result;
                    }).join('') : rawContent;
                    
                    return bullet + inner;
                }
            }
        });
        
        return await marked(content);
    } catch (error) {
        // logger.error(`Error formatting markdown: ${error}`);
        return content;
    }
};