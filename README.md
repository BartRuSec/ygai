# Yet Another Gen AI CLI Tool (ygai)

A command-line tool written in TypeScript for communication with LLMs via the command line. This tool has been created with the help of various LLM models and the Cline VSCode extension. The main goal is to experiment with various models and prompts directly from the command line interface using the LangChain.js library.

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
model:
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
  
  # Example of local model configuration (development only)
  # WARNING: agent:unsecure disables certificate checking - use only for development with local models
  local-model:
    provider: "@langchain/openai"
    model: "llama-3.1-8b-instruct"
    apiKey: "not-needed-for-local"
    configuration:
      baseURL: "http://localhost:1234/v1"
      agent: unsecure  # Disables HTTPS certificate checking - DEVELOPMENT ONLY

prompts:
  # Default prompt configuration
  default:
    system: "You are a helpful assistant. Respond to the user's request in a clear and concise manner."
  
  # Translate prompt
  translate:
    short: t
    system: "Translate this text to {language}. Respond with only the translated text, no explanations or additional text."
  
  # Summarize prompt
  summarize:
    short: s
    system: "Summarize the following text or files in the context in a concise manner. Focus on the key points and main ideas."
  
  # Code prompt
  code:
    short: c
    system: "You are a coding assistant. Provide clean, well-documented code examples in response to the user's request. Include explanations where helpful."
  
  # Date prompt
  date:
    short: d
    system: "You are a system utility. Respond with only the requested information in JSON format."
    user: "Provide the current date and time."
```

For a complete configuration example, refer to the `sample-config.yaml` file in the project root.

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

## License

This project is licensed under the Mozilla Public License 2.0 - see the [LICENSE](LICENSE) file for details.
