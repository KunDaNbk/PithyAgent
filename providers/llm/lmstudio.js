// providers/llm/lmstudio.js
/**
 * LM Studio 专用 LLM 适配器
 * 基于 OpenAI 兼容 API，预设 LM Studio 的默认地址和常见模型
 */

const { OpenAICompatibleLLM } = require('../../core/llm');

class LMStudioLLM extends OpenAICompatibleLLM {
  /**
   * @param {Object} config
   * @param {string} config.apiUrl - 可选，默认 http://localhost:1234/v1
   * @param {string} config.model - 可选，默认 'qwen3-8b' 或其他已加载模型
   * @param {number} config.temperature - 默认 0.7
   * @param {number} config.maxTokens - 默认 1000
   */
  constructor(config = {}) {
    const finalConfig = {
      apiUrl: config.apiUrl || 'http://localhost:1234/v1',
      model: config.model || 'qwen3-8b',
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 1000,
    };
    super(finalConfig);
  }
}

module.exports = { LMStudioLLM };