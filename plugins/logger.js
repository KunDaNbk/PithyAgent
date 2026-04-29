// plugins/logger.js
/**
 * 日志插件示例
 * 记录 Agent 运行过程中的关键事件
 */

/**
 * @param {Agent} agent - Agent 实例
 * @param {EventBus} events - 事件总线
 */
function loggerPlugin(agent, events) {
  events.on('before-run', ({ userInput, sessionId }) => {
    console.log(`[${new Date().toISOString()}] [${sessionId}] User: ${userInput}`);
  });

  events.on('before-tool-execution', ({ toolCalls, sessionId }) => {
    for (const tc of toolCalls) {
      console.log(`[${new Date().toISOString()}] [${sessionId}] Tool call: ${tc.function.name}(${tc.function.arguments})`);
    }
  });

  events.on('after-run', ({ finalAnswer, sessionId }) => {
    console.log(`[${new Date().toISOString()}] [${sessionId}] Agent: ${finalAnswer.substring(0, 200)}${finalAnswer.length > 200 ? '...' : ''}`);
  });
}

module.exports = loggerPlugin;