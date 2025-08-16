/**
 * Pre-hook example for translation prompt
 * This hook validates and preprocesses the translation request
 */

function prepareText(context) {
  console.log('Pre-hook: Preparing translation...');
  
  // Validate language variable
  if (!context.variables.language) {
    throw new Error('Language variable is required for translation');
  }
  
  // Normalize language code to lowercase
  context.variables.language = context.variables.language.toLowerCase();
  
  // Add some preprocessing logic
  if (context.userInput.length > 1000) {
    console.warn('Warning: Text is quite long, translation may take time');
  }
  
  // You can modify the prompt based on the input
  if (context.userInput.includes('technical')) {
    context.promptConfig.system += ' Use technical terminology when appropriate.';
  }
  
  console.log(`Pre-hook: Ready to translate to ${context.variables.language}`);
  
  return context;
}

module.exports = { prepareText };
