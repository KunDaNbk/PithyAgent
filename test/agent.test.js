// test/agent.test.js
// 简单测试：使用 mock LLM 验证 Agent 的基础功能
// 运行方式：node test/agent.test.js

const assert = require('assert');
const { Agent, ToolRegistry, InMemoryMemory, EventBus } = require('../index');

// ----- Mock LLM (模拟 OpenAI 兼容接口) -----
class MockLLM {
  constructor() {
    this.callCount = 0;
  }

  async chat(messages, options = {}) {
    this.callCount++;
    // 模拟工具调用：如果消息中包含“天气”，返回工具调用
    const lastUserMsg = messages.filter(m => m.role === 'user').pop();
    if (lastUserMsg && lastUserMsg.content.includes('天气')) {
      return {
        content: '',
        toolCalls: [{
          id: 'call_123',
          type: 'function',
          function: {
            name: 'get_weather',
            arguments: JSON.stringify({ city: '北京' })
          }
        }]
      };
    }
    // 普通回复
    return { content: '这是模拟回复', toolCalls: null };
  }

  async chatStream(messages, options = {}) {
    // 简单流式模拟
    const self = this;
    return {
      async *[Symbol.asyncIterator]() {
        yield '模';
        yield '拟';
        yield '流';
        yield '式';
      }
    };
  }
}

// ----- 准备工作 -----
async function testAgentBasic() {
  console.log('测试1: Agent 基础对话...');
  const llm = new MockLLM();
  const memory = new InMemoryMemory();
  const agent = new Agent({ llm, memory, sessionId: 'test-session' });

  const answer = await agent.run('你好');
  assert.strictEqual(answer, '这是模拟回复');
  console.log('✅ 基础对话测试通过');
}

async function testToolCalling() {
  console.log('\n测试2: 工具调用...');
  const llm = new MockLLM();
  const tools = new ToolRegistry();
  let toolExecuted = false;
  tools.register({
    name: 'get_weather',
    description: '获取天气',
    parameters: { type: 'object', properties: { city: { type: 'string' } } },
    execute: async ({ city }) => {
      toolExecuted = true;
      return `${city} 晴天 25°C`;
    }
  });
  const agent = new Agent({ llm, tools, memory: new InMemoryMemory() });
  const answer = await agent.run('北京天气怎么样？');
  assert.ok(toolExecuted, '工具应该被执行');
  assert.ok(answer.includes('晴天') || answer.includes('25°C'), '最终回答应包含工具结果');
  console.log('✅ 工具调用测试通过');
}

async function testStreaming() {
  console.log('\n测试3: 流式输出...');
  const llm = new MockLLM();
  const agent = new Agent({ llm });
  let chunks = '';
  for await (const chunk of agent.runStream('讲个笑话')) {
    chunks += chunk;
  }
  assert.strictEqual(chunks, '模拟流式');
  console.log('✅ 流式输出测试通过');
}

async function testEvents() {
  console.log('\n测试4: 事件钩子...');
  const llm = new MockLLM();
  const events = new EventBus();
  let beforeRunCalled = false;
  let afterRunCalled = false;
  events.on('before-run', () => { beforeRunCalled = true; });
  events.on('after-run', () => { afterRunCalled = true; });
  const agent = new Agent({ llm, events });
  await agent.run('hello');
  assert.ok(beforeRunCalled, 'before-run 事件应触发');
  assert.ok(afterRunCalled, 'after-run 事件应触发');
  console.log('✅ 事件钩子测试通过');
}

async function testMemory() {
  console.log('\n测试5: 记忆持久化...');
  const llm = new MockLLM();
  const memory = new InMemoryMemory();
  const agent = new Agent({ llm, memory, sessionId: 'mem-test' });
  await agent.run('我叫小明');
  const messages = await memory.getLast(10, 'mem-test');
  const lastUser = messages.find(m => m.role === 'user');
  assert.ok(lastUser && lastUser.content === '我叫小明', '用户消息应被保存');
  console.log('✅ 记忆测试通过');
}

// 运行所有测试
async function run() {
  try {
    await testAgentBasic();
    await testToolCalling();
    await testStreaming();
    await testEvents();
    await testMemory();
    console.log('\n🎉 所有测试通过！');
  } catch (err) {
    console.error('\n❌ 测试失败:', err.message);
    process.exit(1);
  }
}

run();