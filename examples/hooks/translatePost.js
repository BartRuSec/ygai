/**
 * Post-hook example for translation prompt
 * This hook validates and processes the translation result
 */

function validateTranslation(context) {
  console.log('Post-hook: Validating translation...');
  
  // Access original user input and response
  const originalLength = context.userInput.length;
  const translatedLength = context.response.length;
  
  // Basic validation - translation shouldn't be drastically different in length
  if (translatedLength < originalLength * 0.3) {
    console.warn('Warning: Translation seems unusually short compared to original');
  } else if (translatedLength > originalLength * 3) {
    console.warn('Warning: Translation seems unusually long compared to original');
  }
  
  // Check if translation looks valid (not empty)
  if (context.response.trim().length === 0) {
    throw new Error('Translation appears to be empty');
  }
  
  // Log translation for audit purposes
  const preview = context.response.length > 50 
    ? context.response.substring(0, 50) + '...' 
    : context.response;
  
  console.log(`Post-hook: Successfully translated to ${context.variables.language}`);
  console.log(`Post-hook: Translation preview: "${preview}"`);
  
  // You could save translation to a file, send to an API, etc.
  // For example, save to audit log:
  // const fs = require('fs');
  // const auditEntry = {
  //   timestamp: context.metadata.timestamp,
  //   language: context.variables.language,
  //   originalText: context.userInput,
  //   translation: context.response
  // };
  // fs.appendFileSync('translation-audit.log', JSON.stringify(auditEntry) + '\n');
  
  return context;
}

module.exports = { validateTranslation };
