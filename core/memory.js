// core/memory.js
/**
 * 记忆管理模块
 * 提供对话历史存储的抽象接口及内置内存实现
 */

/**
 * @typedef {Object} Message
 * @property {string} role - 消息角色: 'user' | 'assistant' | 'tool' | 'system'
 * @property {string} content - 消息内容
 * @property {Object} [metadata] - 附加元数据（如工具调用ID、时间戳等）
 */

/**
 * 记忆提供者抽象类
 */
class MemoryProvider {
  /**
   * 添加一条消息
   * @param {string} role - 角色
   * @param {string} content - 内容
   * @param {Object} [metadata] - 元数据
   * @returns {Promise<void>}
   */
  async add(role, content, metadata = {}) {
    throw new Error('Not implemented');
  }

  /**
   * 获取最近 N 条消息
   * @param {number} n - 条数
   * @param {string} [sessionId] - 会话标识（默认为全局）
   * @returns {Promise<Message[]>}
   */
  async getLast(n, sessionId = 'default') {
    throw new Error('Not implemented');
  }

  /**
   * 获取所有消息（按时间顺序）
   * @param {string} [sessionId]
   * @returns {Promise<Message[]>}
   */
  async getAll(sessionId = 'default') {
    throw new Error('Not implemented');
  }

  /**
   * 清空指定会话的消息
   * @param {string} [sessionId]
   * @returns {Promise<void>}
   */
  async clear(sessionId = 'default') {
    throw new Error('Not implemented');
  }
}

/**
 * 内存记忆实现（非持久化，仅当前进程有效）
 */
class InMemoryMemory extends MemoryProvider {
  constructor() {
    super();
    /** @type {Map<string, Message[]>} */
    this.store = new Map();
  }

  _getStore(sessionId) {
    if (!this.store.has(sessionId)) {
      this.store.set(sessionId, []);
    }
    return this.store.get(sessionId);
  }

  async add(role, content, metadata = {}) {
    const sessionId = metadata.sessionId || 'default';
    const messages = this._getStore(sessionId);
    messages.push({
      role,
      content,
      metadata: { ...metadata, timestamp: Date.now() }
    });
  }

  async getLast(n, sessionId = 'default') {
    const messages = this._getStore(sessionId);
    return messages.slice(-n);
  }

  async getAll(sessionId = 'default') {
    return this._getStore(sessionId);
  }

  async clear(sessionId = 'default') {
    if (this.store.has(sessionId)) {
      this.store.delete(sessionId);
    }
  }
}

module.exports = { MemoryProvider, InMemoryMemory };