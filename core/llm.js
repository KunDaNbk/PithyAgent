// core/llm.js
/**
 * LLM 抽象基类及 OpenAI 兼容实现
 * 提供与本地大模型（LM Studio、Ollama 等）通信的基础能力
 */

class LLMProvider {
  /**
   * 发送聊天请求（非流式）
   * @param {Array<{role: string, content: string}>} messages
   * @param {Object} options
   * @returns {Promise<{content: string, toolCalls?: Array}>}
   */
  async chat(messages, options = {}) {
    throw new Error('Not implemented');
  }

  /**
   * 发送聊天请求（流式）
   * @param {Array<{role: string, content: string}>} messages
   * @param {Object} options
   * @returns {Promise<AsyncIterable<string>>} 返回异步迭代器，每次 yield 一个 token
   */
  async chatStream(messages, options = {}) {
    throw new Error('Not implemented');
  }
}

/**
 * OpenAI 兼容 API 实现（支持 LM Studio / Ollama / vLLM）
 */
class OpenAICompatibleLLM extends LLMProvider {
  constructor(config = {}) {
    super();
    this.apiUrl = config.apiUrl || 'http://localhost:1234/v1';
    this.model = config.model || 'qwen3-8b';
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens ?? 1000;
  }

  async chat(messages, options = {}) {
    const payload = {
      model: this.model,
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
      throw new Error(`LLM API error (${response.status}): ${errText}`);
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
      model: this.model,
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
      throw new Error(`LLM API error (${response.status}): ${errText}`);
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

module.exports = { LLMProvider, OpenAICompatibleLLM };