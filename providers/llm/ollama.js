// providers/llm/ollama.js
/**
 * Ollama 本地模型适配器
 * Ollama 提供与 OpenAI 兼容的 API 端点（默认 http://localhost:11434/v1）
 */

const { LLMProvider } = require('../../core/llm');

class OllamaLLM extends LLMProvider {
  /**
   * @param {Object} config
   * @param {string} config.apiUrl - 可选，默认 http://localhost:11434/v1
   * @param {string} config.model - 模型名称，例如 'qwen2.5:7b', 'llama3.2:3b'
   * @param {number} config.temperature - 默认 0.7
   * @param {number} config.maxTokens - 默认 1000
   */
  constructor(config = {}) {
    super();
    this.apiUrl = config.apiUrl || 'http://localhost:11434/v1';
    this.model = config.model || 'qwen2.5:7b';
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

    const response = await fetch(`${this.apiUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Ollama API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const message = data.choices[0].message;
    return {
      content: message.content || '',
      toolCalls: message.tool_calls || null
    };
  }

  async chatStream(messages, options = {}) {
    const payload = {
      model: options.model || this.model,
      messages,
      temperature: options.temperature ?? this.temperature,
      max_tokens: options.maxTokens ?? this.maxTokens,
      stream: true,
    };
    if (options.tools && options.tools.length) {
      payload.tools = options.tools;
      payload.tool_choice = 'auto';
    }

    const response = await fetch(`${this.apiUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Ollama API error (${response.status}): ${errText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    return {
      async *[Symbol.asyncIterator]() {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('data: ')) {
                const dataStr = trimmed.slice(6);
                if (dataStr === '[DONE]') return;
                try {
                  const parsed = JSON.parse(dataStr);
                  const content = parsed.choices[0]?.delta?.content;
                  if (content) yield content;
                } catch (e) {
                  // 忽略解析错误
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }
    };
  }
}

module.exports = { OllamaLLM };
