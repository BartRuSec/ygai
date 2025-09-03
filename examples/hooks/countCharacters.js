/**
 * Pre-hook example - counts total characters in all messages in state
 */

function countCharacters(state, data, config) {
  console.log('Pre-hook: Counting characters in all messages...');
  
  // Count characters in all messages in state
  let totalCharacters = 0;
  if (state.messages) {
    for (const message of state.messages) {
      totalCharacters += (message.content || '').length;
    }
  }
  
  console.log(`Total characters in conversation: ${totalCharacters}`);
  
  // Return variables to add to workflow
  return {
    total_characters: totalCharacters
  };
}

module.exports = { countCharacters };