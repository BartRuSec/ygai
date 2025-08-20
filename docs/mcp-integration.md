# MCP (Model Context Protocol) Integration

YGAI supports MCP (Model Context Protocol) integration, allowing you to extend the capabilities of your AI models with external tools and resources.

## Configuration

MCP servers are configured in the `mcp` section of your configuration file:

```yaml
mcp:
  # Math server using STDIO transport
  math:
    transport: "stdio"
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-math"]
    restart:
      enabled: true
      maxAttempts: 3
      delayMs: 1000
  
  # Filesystem server
  filesystem:
    transport: "stdio"
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/directory"]
    restart:
      enabled: true
      maxAttempts: 3
      delayMs: 1000
  
  # HTTP/SSE server example
  weather:
    url: "https://example.com/weather/mcp"
    headers:
      Authorization: "Bearer your-api-token"
    automaticSSEFallback: false
    reconnect:
      enabled: true
      maxAttempts: 5
      delayMs: 2000
```

## Using MCP in Prompts

To use MCP servers in your prompts, specify them in the `mcp` field:

```yaml
prompts:
  # Single MCP server
  math-helper:
    system: "You are a math assistant with calculation tools."
    mcp: "math"
  
  # Multiple MCP servers
  research-assistant:
    system: "You are a research assistant with multiple tools."
    mcp: ["filesystem", "math", "weather"]
```

## MCP Server Configuration Options

### STDIO Transport
```yaml
server-name:
  transport: "stdio"
  command: "npx"
  args: ["-y", "@modelcontextprotocol/server-name"]
  restart:
    enabled: true
    maxAttempts: 3
    delayMs: 1000
```

### HTTP/SSE Transport
```yaml
server-name:
  url: "https://example.com/mcp"
  headers:
    Authorization: "Bearer token"
  automaticSSEFallback: true
  reconnect:
    enabled: true
    maxAttempts: 5
    delayMs: 2000
```

### SSE Transport
```yaml
server-name:
  transport: "sse"
  url: "https://example.com/mcp"
  reconnect:
    enabled: true
    maxAttempts: 5
    delayMs: 2000
```

## How It Works

1. **Configuration Loading**: MCP server configurations are loaded from the config file
2. **Prompt Execution**: When a prompt specifies MCP servers, they are initialized
3. **Tool Integration**: Available tools from MCP servers are integrated with the LLM
4. **Agent Creation**: A React agent is created that can use the MCP tools
5. **Execution**: The agent can call MCP tools during conversation
6. **Cleanup**: MCP connections are properly closed after execution

## Features

- **Multiple Transport Types**: Supports STDIO, HTTP, and SSE transports
- **Automatic Reconnection**: Configurable reconnection for network-based servers
- **Process Restart**: Automatic restart for STDIO servers that crash
- **Tool Integration**: Seamless integration with LangChain's tool calling
- **Streaming Support**: Works with both streaming and non-streaming responses
- **Error Handling**: Graceful degradation when MCP servers are unavailable
- **History Support**: MCP tool calls are included in chat history

## Examples

### Math Assistant
```bash
# Using the math-helper prompt
ygai math-helper "What is the square root of 144 plus 25 factorial?"
```

### File Analysis
```bash
# Using the file-analyzer prompt
ygai file-analyzer "Analyze the data in data.csv and calculate the mean"
```

### Research Assistant
```bash
# Using multiple MCP servers
ygai research-assistant "Read the report.txt file, calculate statistics, and check the weather"
```

## Troubleshooting

- **Server Not Found**: Ensure MCP server packages are installed
- **Connection Failed**: Check server URLs and authentication
- **Tool Errors**: MCP tool errors are returned to the model for handling
- **Performance**: MCP connections are created per execution for reliability
