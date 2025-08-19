
import https from 'https';
import { ModelConfig } from './schema';
import logger from '../utils/logger';
import { loadDynamicClass } from './dynamic-loader';
/**
 * Creates an unsecure HTTPS agent that bypasses certificate validation
 * WARNING: Use only for development with local models
 */
const createUnsecureAgent = (): https.Agent => {
  return new https.Agent({
    rejectUnauthorized: false,
  });
};

/**
 * Creates an HTTPS agent with custom properties
 * @param properties The properties to configure the agent with
 * @returns A new HTTPS agent instance
 */
const createCustomAgent = (properties: Record<string, any>): https.Agent => {
  return new https.Agent(properties);
};

/**
 * Determines if a value should be processed as an HTTP agent configuration
 * @param value The value to check
 * @returns True if the value should be processed
 */
const shouldProcessAgent = (value: any): boolean => {
  return value === 'unsecure' || (typeof value === 'object' && value !== null && !value.constructor?.name?.includes('Agent'));
};

/**
 * Creates an enhanced agent based on the configuration value
 * @param value The agent configuration value
 * @returns The appropriate agent instance
 */
const createEnhancedAgent = (value: any): https.Agent => {
  if (value === 'unsecure') {
    logger.debug('Creating unsecure HTTPS agent - WARNING: Certificate validation disabled');
    return createUnsecureAgent();
  }
  
  if (typeof value === 'object' && value !== null) {
    logger.debug('Creating custom HTTPS agent with properties:', value);
    return createCustomAgent(value);
  }
  
  // Return the value as-is if it's already an agent or unknown type
  return value;
};

/**
 * Recursively processes an object to find and enhance HTTP agent configurations
 * @param obj The object to process
 * @returns A new object with enhanced HTTP agent configurations
 */
const processHttpAgents = (obj: any): any => {
  // Handle primitive types and null
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => processHttpAgents(item));
  }
  
  // Handle objects
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if ((key === 'httpAgent' || key === 'httpsAgent') && shouldProcessAgent(value)) {
      result[key] = createEnhancedAgent(value);
    } else if (key === 'agent' && shouldProcessAgent(value)) {
      // Handle the legacy 'agent' key as well
      result[key] = createEnhancedAgent(value);
    } else if (typeof value === 'object' && value !== null) {
      // Recursively process nested objects
      result[key] = processHttpAgents(value);
    } else {
      // Copy primitive values as-is
      result[key] = value;
    }
  }
  
  return result;
};

/**
 * Processes and applies default values for model parameters
 * @param config The model configuration to process
 * @returns Configuration with default values applied
 */
const processDefaultValues = (config: ModelConfig): ModelConfig => {
  return {
    ...config,
    modelName: config.model, // Map 'model' to 'modelName' for LangChain compatibility
    temperature: config.temperature ?? 0.7, // Default temperature if not specified
  };
};

/**
 * Enhances a model configuration with various improvements
 * Currently handles HTTP agent configurations and default values, but can be extended for future enhancements
 * @param config The model configuration to enhance
 * @returns An enhanced model configuration
 */
/**
 * Recursively processes dynamic class instantiation (_type/_module)
 * Ensures proper hierarchy resolution where dependencies are resolved first
 * @param obj Configuration object to process
 * @param provider Optional provider context from parent configuration
 * @param moduleRegistry Optional module registry containing pre-loaded modules
 * @returns Processed configuration with classes instantiated
 */
export const processDynamicClasses = async (obj: any, provider?: string, moduleRegistry?: Map<string, any>): Promise<any> => {
  // Handle primitive types and null
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Process arrays
  if (Array.isArray(obj)) {
    return Promise.all(obj.map(item => processDynamicClasses(item, provider, moduleRegistry)));
  }

  // Extract provider from current level if available
  const currentProvider = obj.provider || provider;

  // Check if current object needs processing BEFORE processing children
  if (obj._type || obj._inline) {
   // logger.debug(`Processing dynamic class/inline for object with keys: ${Object.keys(obj).join(', ')}`);
    return await loadDynamicClass(obj, currentProvider, moduleRegistry);
  }

  // Preserve HTTPS Agent objects created by processHttpAgents (only if no _type to override)
  if (obj.constructor?.name?.includes('Agent')) {
    logger.debug(`Preserving HTTPS Agent object: ${obj.constructor.name}`);
    return obj;
  }

  // Process objects (depth-first to resolve dependencies first)
  const processedObj: Record<string, any> = {};
  
  // Process each property sequentially to maintain dependency order
  for (const [key, value] of Object.entries(obj)) {
   // logger.debug(`Processing property: ${key}`);
    // Recursively process all properties, passing down the provider context and module registry
    processedObj[key] = await processDynamicClasses(value, currentProvider, moduleRegistry);
  }

  // Return the processed object with resolved children
  return processedObj;
};




export const enhanceModelConfig = async (config: ModelConfig, moduleRegistry?: Map<string, any>): Promise <ModelConfig >=> {
  logger.debug('Enhancing model configuration');
  
  // Create a deep copy to avoid mutating the original config
  let enhancedConfig = JSON.parse(JSON.stringify(config));
  
  // Apply default values first
  enhancedConfig = processDefaultValues(enhancedConfig);
  
  // Apply HTTP agent enhancements
  enhancedConfig = processHttpAgents(enhancedConfig);
  
 // Dynamic class enhancer will be performed with module registry
  enhancedConfig= await processDynamicClasses(enhancedConfig, config.provider, moduleRegistry);
  
  logger.debug('Model configuration enhanced successfully');
  return enhancedConfig;
};
