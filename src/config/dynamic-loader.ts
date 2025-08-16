import logger from "../utils/logger";

/**
 * Loads and instantiates a dynamic class, function, or arrow function from module
 * @param config Object containing _type and optional _module
 * @param provider Optional provider context from parent configuration
 * @param loadedModule Optional pre-loaded module to use instead of dynamic import
 * @returns Instantiated class instance, function result, or function reference
 */

export const loadDynamicClass = async (config: any, provider?: string, loadedModule?: any) => {
  const modulePath = config._module || provider;
  const exportName = config._type;

  // Handle inline function definitions
  //TOOD: This is not working correctly
  if (config._inline && typeof config._inline === 'string') {
    try {
      // Extract parameters, excluding meta properties
      const { _type, _module, _inline, ...params } = config;
      
      // Create a function from the inline string with access to params
      // The inline function should have access to the params object
      const paramKeys = Object.keys(params);
      let functionBody;
      
      if (paramKeys.length > 0) {
        functionBody = `
          const { ${paramKeys.join(', ')} } = params;
          return (${_inline});
        `;
      } else {
        functionBody = `return (${_inline});`;
      }
      
      const functionCreator = new Function('params', functionBody);
      const createdFunction = functionCreator(params);
      
      return createdFunction;
    } catch (error) {
      logger.error(`Inline function creation failed: ${config._inline}`, error);
      throw error;
    }
  }

  if (!modulePath) {
    throw new Error(`No module path specified for ${exportName}. Use _module property, ensure provider is available, or use _inline for inline functions.`);
  }

  if (!exportName) {
    throw new Error('No _type specified for dynamic loading');
  }

  try {
    let module;
    
    // Use the pre-loaded module if available and matches the module path
    if (loadedModule && (modulePath === provider || modulePath.startsWith('@langchain/'))) {
      module = loadedModule;
    } else {
      // Fall back to dynamic import for other modules
      module = await import(modulePath);
    }
    
    const ExportedItem = module[exportName] || module.default?.[exportName];
    
    if (!ExportedItem) {
      throw new Error(`Export ${exportName} not found in ${modulePath}`);
    }

    // Extract parameters, excluding meta properties
    const { _type, _module, ...params } = config;
    
    // Check if it's a function (including arrow functions and regular functions)
    if (typeof ExportedItem === 'function') {
      // Check if it's a class constructor (has prototype with constructor)
      if (ExportedItem.prototype && ExportedItem.prototype.constructor === ExportedItem) {
        // It's a class - instantiate it
        return new ExportedItem(params);
      } else {
        // It's a function or arrow function
        // Create a closure that captures the parameters
        if (Object.keys(params).length > 0) {
          // Return a function that uses the provided parameters
          return (...args: any[]) => {
            // Merge config params with runtime args
            const mergedParams = { ...params, ...args };
            return ExportedItem(mergedParams);
          };
        } else {
          // Return the function reference if no parameters
          return ExportedItem;
        }
      }
    } else {
      // It's not a function, return as-is (could be a constant, object, etc.)
      return ExportedItem;
    }
  } catch (error) {
    logger.error(`Dynamic loading failed: ${exportName} from ${modulePath}`, error);
    throw error;
  }
};
