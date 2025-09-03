/**
 * Post-hook example - counts total words in all messages in state
 */

function countWords(state, data, config) {
  console.log('Post-hook: Counting words in all messages...');
  
  // Count words in all messages in state
  let totalWords = 0;
  if (state.messages) {
    for (const message of state.messages) {
      const content = message.content || '';
      // Split by whitespace and filter out empty strings
      const words = content.trim().split(/\s+/).filter(word => word.length > 0);
      totalWords += words.length;
    }
  }
  
  console.log(`Total words in conversation: ${totalWords}`);
  
  // Return variables to add to workflow
  return {
    total_words: totalWords
  };
}

module.exports = { countWords };