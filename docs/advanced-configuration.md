# Advanced Configuration Options

This document describes advanced configuration features in ygai that allow for dynamic class instantiation and inline function definitions using `_type`, `_module`, and `_inline` properties.

## Overview

ygai supports advanced configuration patterns that enable dynamic loading and instantiation of classes, functions, and inline code within your configuration files. This is particularly useful for:

- Creating custom HTTP agents with specific configurations
- Dynamically loading and configuring third-party modules
- Defining inline functions for specialized behavior
- Advanced model provider customization

> Inline functions are still in progress and might not working as expected

## Dynamic Class Loading with `_type` and `_module`

### Basic Syntax

```yaml
configuration:
  someProperty:
    _type: "ClassName"           # The class or function name to load
    _module: "module-name"       # The module to load from
    # ... additional parameters passed to the constructor/function
```

### How It Works

1. **Module Loading**: The system loads the specified module using either:
   - Pre-loaded modules from the module registry (for performance)
   - Dynamic imports for modules not in the registry

2. **Export Resolution**: Looks for the specified `_type` in the module's exports:
   - First checks direct exports: `module[_type]`
   - Falls back to default exports: `module.default[_type]`

3. **Instantiation**: Determines how to handle the loaded export:
   - **Classes**: Instantiated with `new ClassName(params)`
   - **Functions**: Wrapped to capture configuration parameters
   - **Other exports**: Returned as-is (constants, objects, etc.)

### Examples

#### Custom HTTP Agent

```yaml
models:
  custom-model:
    provider: "@langchain/openai"
    model: "gpt-4"
    apiKey: "your-api-key"
    configuration:
      baseURL: "https://api.example.com/v1"
      httpAgent:
        _type: "Agent"
        _module: "https"
        timeout: 5000
        keepAlive: true
        maxSockets: 10
```

#### Custom Callback Handler

```yaml
models:
  monitored-model:
    provider: "@langchain/openai"
    model: "gpt-4"
    apiKey: "your-api-key"
    callbacks:
      - _type: "ConsoleCallbackHandler"
        _module: "@langchain/core/callbacks/console"
        colors: true
```

#### Third-Party Module Integration

```yaml
models:
  custom-provider:
    provider: "@langchain/openai"
    model: "gpt-4"
    apiKey: "your-api-key"
    configuration:
      customTransform:
        _type: "DataTransformer"
        _module: "my-custom-package"
        transformType: "normalize"
        options:
          preserveCase: true
```

## Inline Functions with `_inline`

### Basic Syntax

```yaml
configuration:
  someProperty:
    _inline: "(params) => { /* your code here */ }"
    # ... parameters available to the inline function
```

### How It Works

1. **Function Creation**: The inline string is wrapped in a function constructor
2. **Parameter Injection**: Configuration parameters are made available to the function
3. **Execution Context**: The function has access to the parameters object

### Examples

#### Simple Inline Function

```yaml
models:
  custom-model:
    provider: "@langchain/openai"
    model: "gpt-4"
    apiKey: "your-api-key"
    configuration:
      customProcessor:
        _inline: "(text) => text.toUpperCase()"
```

#### Inline Function with Parameters

```yaml
models:
  custom-model:
    provider: "@langchain/openai"
    model: "gpt-4"
    apiKey: "your-api-key"
    configuration:
      validator:
        _inline: "() => { return input => input.length <= maxLength; }"
        maxLength: 1000
```

#### Complex Inline Logic

```yaml
models:
  custom-model:
    provider: "@langchain/openai"
    model: "gpt-4"
    apiKey: "your-api-key"
    configuration:
      requestTransformer:
        _inline: |
          () => {
            return (request) => {
              if (debugMode) {
                console.log('Request:', request);
              }
              return {
                ...request,
                headers: {
                  ...request.headers,
                  'X-Custom-Header': customValue
                }
              };
            };
          }
        debugMode: true
        customValue: "ygai-client"
```

## Provider Context Inheritance

When `_module` is not specified, the system automatically uses the provider context from the parent configuration:

```yaml
models:
  openai-custom:
    provider: "@langchain/openai"  # This becomes the default module context
    model: "gpt-4"
    apiKey: "your-api-key"
    configuration:
      customHandler:
        _type: "SomeHandler"  # Will load from "@langchain/openai"
        option1: "value1"
```

## Processing Order and Dependencies

The system processes dynamic configurations in a depth-first manner to ensure dependencies are resolved correctly:

1. **Child Processing First**: Nested objects are processed before their parents
2. **Dependency Resolution**: Dependencies are instantiated before the objects that use them
3. **Registry Utilization**: Pre-loaded modules are used when available for better performance

## Security Considerations

### Inline Functions

- **Execution Timeout**: Inline functions have execution limits to prevent infinite loops
- **Sandboxed Environment**: Limited access to system resources
- **Parameter Validation**: Input parameters are validated before injection

### Dynamic Loading

- **Module Validation**: Only modules that can be successfully imported are loaded
- **Error Handling**: Comprehensive error handling prevents configuration corruption
- **Registry Control**: Module registry provides controlled access to pre-loaded modules

## Error Handling

### Common Errors and Solutions

#### Module Not Found
```
Error: Export SomeClass not found in module-name
```
**Solution**: Verify the module name and export name are correct.

#### Missing Module Path
```
Error: No module path specified for SomeClass
```
**Solution**: Either specify `_module` or ensure a provider context is available.

#### Inline Function Syntax Error
```
Error: Inline function creation failed
```
**Solution**: Check the JavaScript syntax in your `_inline` string.

### Debugging Tips

1. **Enable Debug Logging**: Use `-v` flag to see detailed processing information
2. **Validate Module Exports**: Check what exports are available in your target module
3. **Test Inline Functions**: Test your inline function syntax in a JavaScript console first
4. **Check Dependencies**: Ensure all required modules are installed

## Best Practices

### Performance

- **Use Module Registry**: Pre-load frequently used modules for better performance
- **Minimize Inline Functions**: Prefer external modules for complex logic
- **Cache Results**: Consider caching expensive operations

### Maintainability

- **Document Custom Configurations**: Comment complex dynamic configurations
- **Version Pin Dependencies**: Specify exact versions for dynamic modules
- **Test Configurations**: Validate configurations in development environments

### Security

- **Validate Inputs**: Always validate parameters passed to dynamic functions
- **Limit Inline Complexity**: Keep inline functions simple and focused
- **Review Third-Party Modules**: Audit external modules before use

## Examples Repository

For more examples and use cases, see the `examples/` directory in the project repository, which includes:

- Custom HTTP agent configurations
- Third-party module integrations
- Complex inline function examples
- Performance optimization patterns

## Troubleshooting

If you encounter issues with dynamic configurations:

1. Check the debug logs with `-v` flag
2. Verify module installation and exports
3. Test inline function syntax separately
4. Ensure proper parameter passing
5. Check for circular dependencies

For additional support, please refer to the main project documentation or open an issue on the project repository.
