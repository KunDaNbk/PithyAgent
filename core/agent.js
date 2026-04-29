// core/agent.js
const { EventBus } = require('./event');

class Agent {
  constructor(options = {}) {
    this.llm = options.llm;
    this.tools = options.tools;
    this.memory = options.memory;
    this.events = options.events || new EventBus();
    this.maxIterations = options.maxIterations ?? 5;
    this.sessionId = options.sessionId || 'default';
  }

  async run(userInput) {
    await this.events.emit('before-run', { userInput, sessionId: this.sessionId });
    await this.memory.add('user', userInput, { sessionId: this.sessionId });

    let messages = await this.memory.getLast(20, this.sessionId);
    let iteration = 0;
    let finalAnswer = null;

    while (iteration < this.maxIterations) {
      const toolSchemas = this.tools.getOpenAISchemas();
      const llmResp = await this.llm.chat(messages, { tools: toolSchemas });

      await this.memory.add('assistant', llmResp.content || '[tool-call]', {
        sessionId: this.sessionId,
        toolCalls: llmResp.toolCalls
      });
      messages.push({
        role: 'assistant',
        content: llmResp.content,
        tool_calls: llmResp.toolCalls
      });

      if (llmResp.toolCalls && llmResp.toolCalls.length) {
        await this.events.emit('before-tool-execution', { toolCalls: llmResp.toolCalls, sessionId: this.sessionId });
        for (const tc of llmResp.toolCalls) {
          const funcName = tc.function.name;
          const args = JSON.parse(tc.function.arguments);
          const result = await this.tools.execute(funcName, args);
          await this.memory.add('tool', result, {
            sessionId: this.sessionId,
            toolCallId: tc.id,
            toolName: funcName
          });
          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: result
          });
        }
        iteration++;
        continue;
      } else {
        finalAnswer = llmResp.content;
        break;
      }
    }

    if (!finalAnswer) {
      finalAnswer = 'Agent reached max iterations without final answer.';
      await this.memory.add('assistant', finalAnswer, { sessionId: this.sessionId });
    }

    await this.events.emit('after-run', { finalAnswer, sessionId: this.sessionId });
    return finalAnswer;
  }

  /**
   * 流式对话（简化版：不处理工具调用，直接返回生成内容流）
   * 注意：若模型可能调用工具，请使用 run 方法。
   */
  async *runStream(userInput) {
    await this.events.emit('before-run', { userInput, sessionId: this.sessionId });
    await this.memory.add('user', userInput, { sessionId: this.sessionId });
    const messages = await this.memory.getLast(20, this.sessionId);
    // 流式模式下，我们不传入 tools，以避免复杂的工具调用交织
    const stream = await this.llm.chatStream(messages);
    let fullContent = '';
    for await (const chunk of stream) {
      fullContent += chunk;
      yield chunk;
    }
    await this.memory.add('assistant', fullContent, { sessionId: this.sessionId });
    await this.events.emit('after-run', { finalAnswer: fullContent, sessionId: this.sessionId });
  }

  async reset() {
    await this.memory.clear(this.sessionId);
  }
}

module.exports = { Agent };