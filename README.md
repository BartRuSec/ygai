# Yet Another Gen AI CLI Tool (ygai)

A command-line tool written in TypeScript for communication with LLMs via the command line. The main goal is to experiment with various models and prompts directly from the command line interface using the LangChain.js library.

> **⚠️ Early Development Warning**  
> This tool is in very early development stage. Expect conceptual breaking changes as the architecture evolves. APIs, configuration formats, and core concepts may change significantly between versions. Use with caution in production environments.

## Prerequisites

- Node.js (version 14 or higher)
- npm

## Features

- Communicate with various LLM providers (OpenAI, Anthropic, and more)
- Dynamic loading of model providers
- Configuration via YAML files
- Session management for chat-like interactions
- Streaming responses
- Configurable output formatting (plain text or markdown)
- File input support with multiple formats:
  - Text files (`.txt`)
  - Markdown files (`.md`)
  - JSON files (`.json`)
  - YAML files (`.yaml`, `.yml`)
  - HTML files (`.html`, `.htm`)
  - PDF files (`.pdf`)
  - DOCX files (`.docx`)
  - XLSX files (`.xlsx`, `.xlsm`, `.xlsb`)
  - OpenDocument files (`.odt`, `.ods`, `.odp`)
  - PowerPoint files (`.pptx`)
- Variable substitution in prompts
- Customizable system and user prompts
- File-based prompt support (load prompts from external files)
- MCP (Model Context Protocol) integration for external tools and resources

## Installation

```bash
npm install -g ygai
```

## Configuration

The tool reads configuration from the following locations (in order of precedence):

1. `.ygai/config.yaml` in the current directory
2. `.ygai/config.yaml` in the user's home directory

Example configuration (see `sample-config.yaml` for a complete reference):

```yaml
models:
  # Default model configuration (mandatory)
  default:
    provider: "@langchain/openai"
    model: "gpt-4"
    apiKey: "your-openai-api-key"
    temperature: 0.7
    # Optional: Context window and output token limits
    contextWindow: 128000
    maxOutputTokens: 4096
  
  # Additional model configurations with context limits
  anthropic:
    provider: "@langchain/anthropic"
    model: "claude-3-5-sonnet-20241022"
    apiKey: "your-anthropic-api-key"
    temperature: 0.7

  
  # Example of OpenRouter configuration
  openrouter-deepseek:
    provider: "@langchain/openai"
    model: "deepseek/deepseek-chat-v3-0324:free"
    apiKey: "your-openrouter-key"
    configuration: 
      baseURL: https://openrouter.ai/api/v1
      # Optional configuration for http agent (just as a example - typically not needed)
      httpAgent:
       timeout: 3000

  # Example of local model configuration (development only)
  # WARNING: httpAgent:unsecure disables certificate checking - use only for development with local models
  local-model:
    provider: "@langchain/openai"
    model: "llama-3.1-8b-instruct"
    apiKey: "not-needed-for-local"
    configuration:
      baseURL: "http://localhost:1234/v1"
      httpAgent: unsecure  # Disables HTTPS certificate checking - DEVELOPMENT ONLY

# NOTE: Latest LangChain providers may not expose the httpAgent configuration option.
# Please refer to the specific provider's documentation for available configuration options.

prompts:
  # Default prompt configuration
  default:
    system: "You are a helpful assistant. Respond to the user's request in a clear and concise manner."
  
  # Translate prompt with hooks
  translate:
    alias: t
    system: "Translate this text to {language}. Respond with only the translated text, no explanations or additional text."
    vars: [language]  # Required variables
    pre:
      file: "./examples/hooks/countCharacters.js"
      function: "countCharacters"
    post:
      file: "./examples/hooks/countWords.js"
      function: "countWords"
  
  # Summarize prompt
  summarize:
    alias: s
    system: "Summarize the following text or files in the context in a concise manner. Focus on the key points and main ideas."
  
  # Code prompt
  code:
    alias: c
    system: "You are a coding assistant. Provide clean, well-documented code examples in response to the user's request. Include explanations where helpful."
  
  # Date prompt
  date:
    alias: d
    system: "You are a system utility. Respond with only the requested information in JSON format."
    user: "Provide the current date and time."
  
  # Example of file-based prompts
  file-example:
    alias: fe
    system:
      file: "./prompts/system.txt"
    user:
      file: "./prompts/user.md"
  
  # Mixed format example
  mixed-example:
    system: "You are a helpful assistant."
    user:
      file: "~/prompts/user-template.txt"
```

For a complete configuration example including output formatting examples, refer to the `sample-config.yaml` file in the project root.

### Model Configuration Structure

Model configurations should follow the object structure specific to each provider as documented in the [LangChain.js Chat Models](https://js.langchain.com/docs/integrations/chat/). Each provider may have different required and optional parameters that should be included in the `model` section of your model config.

For provider-specific configuration options and parameters, please refer to the official LangChain documentation for your chosen provider.

### Advanced Configuration Options

ygai supports advanced configuration patterns including dynamic class loading and inline functions using `_type`, `_module`, and `_inline` properties. These features enable:

- Custom HTTP agent configurations
- Dynamic loading of third-party modules
- Inline function definitions for specialized behavior
- Advanced model provider customization

For detailed information about these advanced features, see the [Advanced Configuration Guide](docs/advanced-configuration.md).

### Variable Substitution in Prompts

The tool supports variable substitution in prompt templates using curly braces `{}`. There are two types of variables available:

1. **Custom variables**: Defined using the `-D` flag (e.g., `-Dlanguage=Polish`)
2. **Built-in variables**:
   - `{user_input}`: Contains the user's input text when using a prompt configuration

When you run a command like:
```bash
ygai p translate "Hello world!"
```

The text "Hello world!" becomes available as `{user_input}` in your prompt templates. For example:

```yaml
prompts:
  translate:
    system: "Translate the following text to {language}."
    user: "Text to translate: {user_input}"
```

**Important**: If no `user` prompt is specified in the configuration, the entire user input text will be used directly as the user prompt. This allows for flexible prompt configurations where you can either:
- Define a specific user or system prompt template with `{user_input}` variable
- Let the user input be used directly as the complete user prompt

This allows you to create reusable prompt templates that can incorporate both the user's input and custom variables.

### Hooks System

The tool supports pre and post-execution hooks that allow you to run custom JavaScript code before and after prompt execution. This enables advanced functionality like input validation, preprocessing, output validation, logging, and integration with external systems.

#### Hook Configuration

Hooks can be configured in two ways:

1. **Centralized Hooks** (recommended): Define reusable hooks once and reference them by name
2. **Inline Hooks** (legacy): Define hooks directly in prompt configurations

##### Centralized Hooks Configuration

Define hooks in the `hooks` section for reusability across multiple prompts:

```yaml
# Define reusable hooks
hooks:
  countChars:
    file: "./examples/hooks/countCharacters.js"
    function: "countCharacters"
  countWords:
    file: "./examples/hooks/countWords.js"
    function: "countWords"
  validateInput:
    file: "./examples/hooks/validation.js"
    function: "validateUserInput"

prompts:
  # Single hook reference
  analyze:
    system: "Analyze the provided text."
    pre: countChars
    post: countWords
  
  # Multiple hooks (executed in sequence)
  detailed-analysis:
    system: "Perform detailed text analysis."
    pre: [validateInput, countChars]
    post: [countWords]
  
  # Mixed format - hook references and inline hooks
  mixed-example:
    system: "Process user input"
    pre: countChars     # Reference to centralized hook
    post:               # Inline hook definition
      file: "./examples/hooks/countWords.js"
      function: "countWords"
```

##### Inline Hooks Configuration (Legacy)

You can still define hooks directly in prompt configurations for backward compatibility:

```yaml
prompts:
  analyze-legacy:
    system: "Analyze the provided text."
    pre:
      file: "./examples/hooks/countCharacters.js"
      function: "countCharacters"
    post:
      file: "./examples/hooks/countWords.js"
      function: "countWords"
```

#### Hook Structure

Hook files should export functions that receive workflow state, data, and configuration parameters, and return variables to add to the workflow:

```javascript
// Pre-hook example - count characters in all messages
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
```

#### Hook Parameters

Hook functions receive three parameters:

- **`state`**: Persistent workflow state (contains conversation messages)
- **`data`**: Transient workflow data with:
  - `data.variables`: All workflow variables (from -D flags and built-ins)
  - `data.processedFiles`: Array of processed file contexts if files were provided
  - `data.workflowId`: Current workflow execution ID
  - `data.startTime`: Workflow start timestamp
- **`config`** (optional): Execution configuration for advanced use cases

#### Hook Capabilities

Hooks run in a secure sandbox environment with access to:

- Node.js built-in modules (fs, path, http, etc.)
- External npm packages (can be required)
- Console logging (redirected to the main application logger)
- Timeout protection (5-second execution limit)

#### Required Variables

You can specify required variables that must be provided via `-D` flags:

```yaml
prompts:
  translate:
    vars: [language, format]  # Both language and format are required
    system: "Translate to {language} in {format} format"
```

If required variables are missing, the tool will show an error message before execution.

#### Example Hook Files

See the `examples/hooks/` directory for complete hook examples:
- `countCharacters.js`: Pre-hook that counts characters in all conversation messages
- `countWords.js`: Post-hook that counts words in all conversation messages

### MCP (Model Context Protocol) Integration

MCP (Model Context Protocol) is supported, allowing you to extend your AI models with external tools and resources. MCP enables your models to interact with file systems, perform calculations, access databases, and much more.

> **Performance Note**: 
> MCP connections are established per execution, which means each command that uses MCP will create new connections to the configured servers. This may result in slightly longer execution times, especially for commands that use multiple MCP servers or when servers have longer startup times. For optimal performance, consider this when designing workflows that make frequent use of MCP-enabled prompts.

#### MCP Configuration

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
```

#### Using MCP in Prompts

To use MCP servers in your prompts, specify them in the `mcp` field:

```yaml
prompts:
  # Single MCP server
  math-helper:
    alias: m
    system: "You are a math assistant with access to calculation tools."
    mcp: "math"
  
  # Multiple MCP servers
  research-assistant:
    alias: ra
    system: "You are a research assistant with multiple tools."
    mcp: ["filesystem", "math"]
```

#### MCP Usage Examples

```bash
# Using math tools
ygai p math-helper "What is the square root of 144 plus 25 factorial?"

# Research with multiple tools
ygai p research-assistant "Read report.txt and calculate statistics from the data"
```

For detailed MCP configuration options and advanced usage, see the [MCP Integration Guide](docs/mcp-integration.md).

### Output Formatting Configuration

The tool supports configurable output formatting, allowing you to specify whether responses should be displayed as plain text or with markdown formatting. This is particularly useful for different types of prompts that require different output styles.

#### Output Format Options

You can specify the output format in your prompt configuration using the `output` field:

- **`markdown`** (default): Applies terminal-friendly markdown formatting with colors and styling
- **`plain`**: Outputs raw text without any formatting

```yaml
prompts:
  # Plain text output for shell commands
  sh:
    system: "Provide only zsh code to be executed based on user request."
    output: plain
  
  # Plain text for JSON responses  
  date:
    system: "You are a system utility. Respond with only the requested information in JSON format."
    output: plain
  
  # Plain text for translations (easy copying)
  translate:
    system: "Translate this text to {language}. Respond with only the translated text."
    output: plain
  
  # Markdown formatting for rich explanations (default)
  code:
    system: "You are a coding assistant. Provide clean, well-documented code examples."
    # output: markdown  # Default value, can be omitted
```

#### Important: Streaming vs Non-Streaming Behavior

**Output formatting only applies to non-streaming responses:**

- **Non-streaming mode**: Formatting is applied based on the `output` configuration and CLI flags
- **Streaming mode**: Always outputs plain text in real-time, regardless of configuration

This is because streaming responses are sent directly to the terminal as chunks arrive, making it impossible to apply formatting to the complete response.

#### CLI Override

You can override the prompt configuration using CLI flags when needed. The `--plain` flag will force plain text output regardless of the prompt's `output` configuration.

### File-Based Prompts

The tool supports loading prompts from external files, which is useful for managing large or complex prompts. You can specify file references for both `system` and `user` prompts using the following syntax:

```yaml
prompts:
  # File-based prompts
  file-example:
    system:
      file: "./prompts/system.txt"
    user:
      file: "./prompts/user.md"
  
  # Mixed format (inline system, file-based user)
  mixed-example:
    system: "You are a helpful assistant."
    user:
      file: "~/prompts/user-template.txt"
```

#### File Path Resolution

File paths support several formats:

- **Relative paths**: `./prompts/system.txt` (relative to the config file location)
- **Absolute paths**: `/home/user/prompts/system.txt`
- **Home directory expansion**: `~/.ygai/prompts/system.txt` (cross-platform)

#### Example File Structure

```
.ygai/
├── config.yaml
└── prompts/
    ├── system.txt
    ├── user.md
    └── templates/
        └── coding-assistant.txt
```

The prompt files can contain any text content and support the same variable substitution as inline prompts.

## Usage

The CLI is organized into four main commands:

- `prompt` (or `p`): Generate responses using AI models
- `chat` (or `c`): Execute chat-like conversation with history
- `session` (or `s`): Manage conversation sessions and checkpoints  
- `llms` (or `l`): Manage LLM providers

### Chat Command

Chat history is now stored in SQLite databases (`.ygai/conversations.db` in current folder or `~/.ygai/conversations.db` globally). Each session maintains separate conversation history.

```bash
# Available options
ygai chat -h

# Start a chat session with default session
ygai chat "Hello, how are you?"
# Or using the alias
ygai c "Hello, how are you?"

# Use named sessions for different conversations
ygai c --session work "Let's discuss the project"
ygai c --session research "Help me with my research"

# Using predefined prompts from sample-config.yaml
ygai c d  # Get current date
ygai c t -Dlanguage=Polish "Hello world!"  # Translate to Polish
ygai c s -f document.pdf  # Summarize a PDF file
```

#### Legacy Chat History Migration

> **Note**: The old `.ygai-chat` files are no longer used. If you have previous conversation history you want to preserve, you can include it in new conversations using this workaround:

```bash
# Rename your old chat file to JSON format
mv .ygai-chat ygai-chat.json

# Include it as context in a new conversation
ygai c -f ygai-chat.json "Please review our previous conversation history and continue where we left off"
```

For this to work effectively, create a prompt that handles conversation history:

```yaml
prompts:
  continue-chat:
    system: "You are continuing a conversation. The file ygai-chat.json contains previous conversation history. Review it and seamlessly continue the conversation based on that context."
    user: "{user_input}"
```

Then use: `ygai c continue-chat -f ygai-chat.json "Let's continue our discussion"`

### Session Management

The tool provides comprehensive session and checkpoint management for conversation history stored in SQLite databases.

#### Session Commands

```bash
# List all conversation sessions
ygai session list
# Or using the alias
ygai s ls

# List global sessions instead of local
ygai s list --global

# Show detailed information about a session
ygai s show [session-name] # Show details of [session-name] session
ygai s show            # Show details of 'default' session

# Show session from a specific checkpoint
ygai s show --checkpoint abc123def456
ygai s show [session-name] --checkpoint abc123def456

# Delete a conversation session
ygai s delete [session-name]
ygai s delete              # Delete 'default' session

# List checkpoints for a session
ygai s checkpoints [session-name] 
ygai s checkpoints            # List checkpoints for 'default'

# Clear all conversation data
ygai s clear           # Clear all local conversation data
ygai s clear --global  # Clear all global conversation data

# Use plain output format (useful for scripting)
ygai s list --plain
ygai s checkpoints --plain
```

#### Starting Chat from Checkpoint

You can start or resume a conversation from any specific checkpoint:

```bash
# Start chat from a specific checkpoint
ygai chat --checkpoint abc123def456 "Continue the conversation"

# Start named session from checkpoint
ygai c --session myproject --checkpoint abc123def456 "Let's continue"

# Start global session from checkpoint
ygai c --global --checkpoint abc123def456 "Resume global chat"
```

#### Session Management Examples

```bash
# Basic workflow
ygai c --session work "Start working on the project"
ygai c --session work "Add more details"
ygai s list                    # See all sessions
ygai s show work               # View work session details
ygai s checkpoints work        # List all checkpoints in work session

# Resume from specific point in conversation
ygai s checkpoints work        # Find the checkpoint ID you want
ygai c --session work --checkpoint abc123def456 "Continue from here"

# Clean up old sessions
ygai s list                    # Review existing sessions  
ygai s delete old-project      # Remove specific session
ygai s clear                   # Remove all session data (be careful!)
```

#### Output Formatting

Session commands support both formatted (markdown) and plain text output:

- **Terminal output**: Displays formatted tables with colors and styling
- **Piped output**: Automatically switches to plain text format (tab-separated)
- **Force plain**: Use `--plain` flag to force plain text output

```bash
# Formatted output (default in terminal)
ygai s list

# Plain text output (automatic when piped)
ygai s list | grep myproject

# Force plain text output
ygai s list --plain
```

### Prompt Command

```bash
# Available options
ygai propmpt -h

# Basic usage (default prompt)
ygai prompt "What is the capital of Poland?"

# Or using the alias
ygai p "What is the capital of Poland?"

# Use a specific model configuration
ygai p -m anthropic "What is the capital of Poland?"

# Use a prompt with variables
ygai p translate -Dlanguage=Polish "Hello world!"

# Add files to the context
ygai p -f file1.txt -f file2.pdf "Summarize these files"

# Override the system prompt
ygai p -s "You are a helpful assistant" "What is the capital of Poland?"

# Pipe input
echo "What is the capital of Poland?" | ygai p

# Use global configuration and storage
ygai p --global "What is the capital of Poland?"
ygai c --global --session work "Let's start a global session"
```

### LLMs Command

```bash
# List all installed providers
ygai llms list

# Or using the alias
ygai l list

# Upgrade all installed providers
ygai l upgrade

# Remove all installed providers
ygai l clean
```

#### Manual Provider Installation

As an alternative to using the `llms` command, you can manually install LLM providers directly in the global `.ygai` directory:

```bash
# Navigate to the global .ygai directory (usually in your home directory)
cd ~/.ygai

# Initialize npm if not already done
npm init -y
# or echo {}>package.json

# Install specific providers manually
npm install @langchain/openai
npm install @langchain/anthropic
npm install @langchain/google-genai
# ... install other providers as needed
```

This manual approach gives you more control over which specific versions of providers are installed and can be useful for development or when you need to install providers that aren't automatically managed by the CLI.

### Global Options

```bash
# Enable verbose logging (works with any command)
ygai -v p "What is the capital of Poland?"

# Use global configuration and storage instead of local
ygai p --global "What is the capital of Poland?"
ygai c --global --session work "Let's start a global session"
```

#### Local vs Global Storage

The tool supports two storage locations for configuration and conversation history:

- **Local storage** (default): Uses `.ygai/` directory in the current working directory
  - Configuration: `.ygai/config.yaml`
  - Conversations: `.ygai/conversations.db`

- **Global storage**: Uses `.ygai/` directory in the user's home directory
  - Configuration: `~/.ygai/config.yaml`
  - Conversations: `~/.ygai/conversations.db`

**Note**: LLM providers are always installed globally in `~/.ygai/node_modules/` regardless of the `--global` flag.

Use the `--global` flag to switch to global storage for any command. This is useful when you want to:
- Share configuration across multiple projects
- Maintain global conversation sessions that persist across different working directories

## Development

```bash
# Clone the repository
git clone https://github.com/BartRuSec/ygai.git
cd ygai

# Install dependencies
npm install

# Build the project
npm run build

# Run the CLI
npm start -- "What is the capital of Poland?"

# Run in development mode
npm run dev -- "What is the capital of Poland?"

# Clean build artifacts
npm run clean
```

## Contributing

Contributions are welcome! If you'd like to contribute to this project, please contact me to discuss your ideas and coordinate your contributions.

Whether you want to:
- Report bugs or suggest features
- Improve documentation
- Add new functionality
- Fix existing issues

I'd love to hear from you. Please reach out to discuss how you can contribute to making ygai better.

## Development Tools

This tool has been developed in a hybrid mode, where the core architecture and logic were hand-crafted, while some parts of the implementation were created with the assistance of various LLM models and tools.

## License

This project is licensed under the Mozilla Public License 2.0 - see the [LICENSE](LICENSE) file for details.
