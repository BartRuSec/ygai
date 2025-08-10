/**
 * Mapping of provider packages to their corresponding Chat Model class names
 * Based on the information from docs/models.md
 */
export const providerToModelClassMapping: Record<string, string> = {
  '@langchain/openai': 'ChatOpenAI',
  '@langchain/azure-openai': 'AzureChatOpenAI',
  '@langchain/anthropic': 'ChatAnthropic',
  '@langchain/google-genai': 'ChatGoogleGenerativeAI',
  '@langchain/google-vertexai': 'ChatVertexAI',
  '@langchain/bedrock': 'BedrockChat',
  '@langchain/fireworks': 'ChatFireworks',
  '@langchain/mistralai': 'ChatMistralAI',
  '@langchain/ollama': 'ChatOllama',
  '@langchain/cohere': 'ChatCohere',
  '@langchain/together': 'ChatTogetherAI',
  '@langchain/deepseek': 'ChatDeepSeek',
  '@langchain/xinference': 'ChatXinference',
  '@langchain/prem': 'ChatPremAI',
  '@langchain/hunyuan': 'ChatHunyuan',
  '@langchain/yandex': 'ChatYandexGPT',
  '@langchain/friendli': 'ChatFriendliAI',
};

/**
 * Gets the Chat Model class name for a given provider
 * @param provider The provider package name
 * @returns The Chat Model class name or undefined if not found
 */
export const getChatModelClassName = (provider: string): string | undefined => {
  return providerToModelClassMapping[provider];
};
