// core/tool.js
/**
 * 工具定义及注册管理器
 * 提供工具注册、OpenAI schema 生成、工具执行的能力
 */

/**
 * 工具类
 * @typedef {Object} ToolDefinition
 * @property {string} name - 工具名称（唯一标识）
 * @property {string} description - 工具描述，供 LLM 理解用途
 * @property {Object} parameters - JSON Schema 格式的参数定义
 * @property {Function} execute - 执行函数，接收参数对象，返回 Promise<string>
 */
class Tool {
  /**
   * @param {ToolDefinition} def
   */
  constructor(def) {
    this.name = def.name;
    this.description = def.description;
    this.parameters = def.parameters || { type: 'object', properties: {} };
    this.execute = def.execute;
  }

  /**
   * 转换为 OpenAI 兼容的 tool schema
   * @returns {Object}
   */
  toOpenAI() {
    return {
      type: 'function',
      function: {
        name: this.name,
        description: this.description,
        parameters: this.parameters
      }
    };
  }
}

/**
 * 工具注册表
 */
class ToolRegistry {
  constructor() {
    /** @type {Map<string, Tool>} */
    this.tools = new Map();
  }

  /**
   * 注册一个工具
   * @param {Tool|ToolDefinition} tool
   */
  register(tool) {
    if (!(tool instanceof Tool)) {
      tool = new Tool(tool);
    }
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * 获取所有工具的 OpenAI schema 列表
   * @returns {Array}
   */
  getOpenAISchemas() {
    return Array.from(this.tools.values()).map(t => t.toOpenAI());
  }

  /**
   * 执行指定的工具
   * @param {string} name - 工具名称
   * @param {Object} args - 参数对象
   * @returns {Promise<string>}
   */
  async execute(name, args) {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool "${name}" not found`);
    }
    const result = await tool.execute(args);
    // 确保返回字符串（如果结果不是字符串，转为 JSON 字符串）
    if (typeof result !== 'string') {
      return JSON.stringify(result);
    }
    return result;
  }

  /**
   * 检查工具是否存在
   * @param {string} name
   * @returns {boolean}
   */
  has(name) {
    return this.tools.has(name);
  }

  /**
   * 获取工具的数量
   * @returns {number}
   */
  size() {
    return this.tools.size;
  }
}

module.exports = { Tool, ToolRegistry };