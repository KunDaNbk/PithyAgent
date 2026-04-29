// providers/llm/openai.js
/**
 * OpenAI 官方 API 适配器
 * 使用标准的 OpenAI API 密钥和端点
 */

const { LLMProvider } = require('../../core/llm');

class OpenAILLM extends LLMProvider {
  /**
   * @param {Object} config
   * @param {string} config.apiKey - OpenAI API Key
   * @param {string} config.model - 模型名称，例如 'gpt-4o', 'gpt-3.5-turbo'
   * @param {string} config.baseURL - 可选，默认 https://api.openai.com/v1
   * @param {number} config.temperature - 默认 0.7
   * @param {number} config.maxTokens - 默认 1000
   */
  constructor(config) {
    super();
    if (!config.apiKey) {
      throw new Error('OpenAILLM requires apiKey');
    }
    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-3.5-turbo';
    this.baseURL = config.baseURL || 'https://api.openai.com/v1';
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens ?? 1000;
  }

  async chat(messages, options = {}) {
    const payload = {
      model: options.model || this.model,
      messages,
      temperature: options.temperature ?? this.temperature,
      max_tokens: options.maxTokens ?? this.maxTokens,
    };
    if (options.tools && options.tools.length) {
      payload.tools = options.tools;
      payload.tool_choice = 'auto';
    }

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const message = data.choices[0].message;
    return {
      content: message.content || '',
      toolCalls: message.tool_calls || null
    };
  }
}

module.exports = { OpenAILLM };