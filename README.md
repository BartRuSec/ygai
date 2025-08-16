# Yet Another Gen AI CLI Tool (ygai)

A command-line tool written in TypeScript for communication with LLMs via the command line. The main goal is to experiment with various models and prompts directly from the command line interface using the LangChain.js library.

## Prerequisites

- Node.js (version 14 or higher)
- npm

## Features

- Communicate with various LLM providers (OpenAI, Anthropic, and more)
- Dynamic loading of model providers
- Configuration via YAML files
- Session management for chat-like interactions
- Streaming responses
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
  
  # Additional model configurations
  anthropic:
    provider: "@langchain/anthropic"
    model: "claude-3-7-sonnet-202502219"
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
  # WARNING: agent:unsecure disables certificate checking - use only for development with local models
  local-model:
    provider: "@langchain/openai"
    model: "llama-3.1-8b-instruct"
    apiKey: "not-needed-for-local"
    configuration:
      baseURL: "http://localhost:1234/v1"
      httpAgent: unsecure  # Disables HTTPS certificate checking - DEVELOPMENT ONLY (you can use rejectUnauthorized: false as well)

prompts:
  # Default prompt configuration
  default:
    system: "You are a helpful assistant. Respond to the user's request in a clear and concise manner."
  
  # Translate prompt
  translate:
    alias: t
    system: "Translate this text to {language}. Respond with only the translated text, no explanations or additional text."
  
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

For a complete configuration example, refer to the `sample-config.yaml` file in the project root.

### Model Configuration Structure

Model configurations should follow the object structure specific to each provider as documented in the [LangChain.js Chat Models](https://js.langchain.com/docs/integrations/chat/). Each provider may have different required and optional parameters that should be included in the `model` section of your model config.

For provider-specific configuration options and parameters, please refer to the official LangChain documentation for your chosen provider.

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

Hooks are configured in the prompt configuration using the `pre` and `post` fields:

```yaml
prompts:
  translate:
    vars: [language]  # Required variables
    alias: t
    system: "Translate this text to {language}. Respond with only the translated text."
    pre:
      file: "./examples/hooks/translatePre.js"
      function: "prepareText"
    post:
      file: "./examples/hooks/translatePost.js"
      function: "validateTranslation"
```

#### Hook Structure

Hook files should export functions that accept a context object and return the modified context:

```javascript
// Pre-hook example
function prepareText(context) {
  // Validate required variables
  if (!context.variables.language) {
    throw new Error('Language variable is required');
  }
  
  // Modify variables or prompt configuration
  context.variables.language = context.variables.language.toLowerCase();
  
  // Access user input
  if (context.userInput.includes('technical')) {
    context.promptConfig.system += ' Use technical terminology.';
  }
  
  return context;
}

module.exports = { prepareText };
```

```javascript
// Post-hook example
function validateTranslation(context) {
  // Access the response
  if (context.response.trim().length === 0) {
    throw new Error('Translation appears to be empty');
  }
  
  // Log or audit the result
  console.log(`Translated to ${context.variables.language}`);
  
  return context;
}

module.exports = { validateTranslation };
```

#### Hook Context

The context object passed to hooks contains:

- `variables`: Object containing all variables (from -D flags and built-ins)
- `files`: Array of file contexts if files were provided
- `userInput`: The user's input text (always available, even if empty)
- `response`: The AI model's response (only available in post-hooks)
- `promptConfig`: The resolved prompt configuration (can be modified in pre-hooks)
- `metadata`: Object containing prompt name, model, and timestamp

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
- `translatePre.js`: Input validation and preprocessing
- `translatePost.js`: Output validation and logging

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

The CLI is organized into three main commands:

- `prompt` (or `p`): Generate responses using AI models
- `llms` (or `l`): Manage LLM providers
- `chat` (or `c`): Execute chat-like conversation

### Chat Command

Chat history is stored in `.ygai-chat` file in the current folder. To clear the conversation, simply remove the `.ygai-chat` file.

```bash
# Available options
ygai chat -h

# Start a chat session with default prompt

ygai chat "Hello, how are you?"
# Or using the alias
ygai c "Hello, how are you?"

# Using predefined prompts from sample-config.yaml
ygai c d  # Get current date
ygai c t -Dlanguage=Polish "Hello world!"  # Translate to Polish
ygai c s -f document.pdf  # Summarize a PDF file
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
```

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

This tool has been developed in a hybrid mode, where the core architecture and logic were hand-crafted, while some parts of the implementation were created with the assistance of various LLM models and the Cline VSCode extension.

## License

This project is licensed under the Mozilla Public License 2.0 - see the [LICENSE](LICENSE) file for details.
