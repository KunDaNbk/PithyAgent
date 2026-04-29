// core/event.js
const EventEmitter = require('events');

/**
 * 简单事件总线
 * 用于 Agent 生命周期钩子：before-run, before-tool-execution, after-run
 */
class EventBus extends EventEmitter {
  /**
   * 触发事件
   * @param {string} event - 事件名
   * @param {any} payload - 数据
   * @returns {Promise<void>}
   */
  async emit(event, payload) {
    // 异步触发，确保所有监听器按序执行
    const listeners = this.listeners(event);
    for (const listener of listeners) {
      await listener(payload);
    }
  }
}

module.exports = { EventBus };