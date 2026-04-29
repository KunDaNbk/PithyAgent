PithyAgent
https://img.shields.io/badge/npm-v0.3.0-blue https://img.shields.io/badge/License-MIT-yellow.svg

PithyAgent 是一个 极轻量、零黑盒、完全可控 的 Node.js Agent 框架，专为本地大模型（LM Studio / Ollama）设计，支持工具调用、多轮记忆、RAG 检索和流式输出。核心代码 < 500 行，无冗余依赖。

零黑盒 – 所有 API 调用显式清晰，无隐藏缓存与隐式重试。

本地优先 – 专为 LM Studio、Ollama 等本地推理服务优化，同时兼容 OpenAI API。

轻量透明 – 你掌控执行循环，调试、扩展、修改轻松自如。

功能完备 – 工具调用、多轮记忆、RAG 与流式输出一应俱全。

安装
bash
npm install pithyagent
或克隆仓库直接使用：

bash
git clone https://github.com/KunDaNbk/PithyAgent.git
cd PithyAgent
npm install   # 仅用于开发测试，运行时无强制依赖
快速开始
基础对话（无工具）
javascript
const { Agent, LMStudioLLM, InMemoryMemory } = require('pithyagent');

const llm = new LMStudioLLM({ model: 'qwen3-8b' });
const memory = new InMemoryMemory();
const agent = new Agent({ llm, memory });

const answer = await agent.run('你好，请介绍一下自己');
console.log(answer);
带工具的 Agent（天气查询）
javascript
const { Agent, OllamaLLM, ToolRegistry, InMemoryMemory } = require('pithyagent');

const llm = new OllamaLLM({ model: 'qwen2.5:7b' });
const tools = new ToolRegistry();
tools.register({
  name: 'get_weather',
  description: '查询指定城市的天气',
  parameters: {
    type: 'object',
    properties: { city: { type: 'string' } },
    required: ['city']
  },
  execute: async ({ city }) => `${city} 今天多云，22℃`
});

const agent = new Agent({ llm, tools, memory: new InMemoryMemory() });
const answer = await agent.run('北京天气怎么样？');
console.log(answer);
流式输出（无工具调用）
javascript
const { Agent, OpenAICompatibleLLM } = require('pithyagent');

const llm = new OpenAICompatibleLLM({ apiUrl: 'http://localhost:1234/v1' });
const agent = new Agent({ llm });

for await (const chunk of agent.runStream('讲一个短笑话')) {
  process.stdout.write(chunk);
}
持久化记忆（SQLite）
javascript
const { Agent, OllamaLLM, SQLiteMemory } = require('pithyagent');

const memory = new SQLiteMemory('./conversations.db', 'user-123');
const agent = new Agent({ llm: new OllamaLLM(), memory });

await agent.run('我叫张三');
await agent.run('我叫什么名字？'); // 能回忆起
核心概念
LLM（大模型客户端）
抽象层，支持任意 OpenAI 兼容 API。内置提供：

LMStudioLLM（默认 http://localhost:1234/v1）

OllamaLLM（默认 http://localhost:11434/v1）

OpenAILLM（需要 API Key）

OpenAICompatibleLLM（通用配置，可自定义 apiUrl、modelName 等）

javascript
new LMStudioLLM({ model: 'qwen3-8b', temperature: 0.7, maxTokens: 1000 });
Tool（工具）
工具由 名称、描述、参数 Schema、执行函数 构成。框架自动生成 OpenAI tools 参数，模型决定何时调用。

注册示例：

javascript
const { ToolRegistry } = require('pithyagent');
const tools = new ToolRegistry();
tools.register({
  name: 'calculator',
  description: '执行数学计算',
  parameters: {
    type: 'object',
    properties: { expr: { type: 'string' } },
    required: ['expr']
  },
  execute: async ({ expr }) => {
    // 注意：生产环境请使用安全的表达式解析库
    return eval(expr).toString();
  }
});
Memory（记忆）
负责存储对话历史。内置：

InMemoryMemory：进程内存储，重启后丢失，适合本地调试。

SQLiteMemory：持久化到文件，支持多会话。

javascript
const memory = new SQLiteMemory('./chat.db', 'sessionId');
Agent（智能体）
核心执行器。支持：

run(userInput) – 自动处理工具调用循环，返回完整答案。

runStream(userInput) – 流式输出（不处理工具调用，仅生成文本）。

reset() – 清空当前会话记忆。

配置选项：

javascript
const agent = new Agent({
  llm,                 // LLM 实例（必填）
  tools,               // ToolRegistry 实例（可选）
  memory,              // Memory 实例（可选，默认为 InMemoryMemory）
  events,              // EventBus 实例（可选）
  maxIterations: 5,    // 最大工具调用轮数
  sessionId: 'default' // 会话标识，用于记忆隔离
});
EventBus（事件总线）
用于监听 Agent 生命周期，方便日志、监控、限流等插件开发。

支持的事件：

before-run：用户输入后，开始处理前。

before-tool-execution：执行工具前。

after-run：返回最终答案后。

示例：

javascript
const { EventBus } = require('pithyagent');
const events = new EventBus();
events.on('before-run', ({ userInput }) => console.log(`用户输入: ${userInput}`));
const agent = new Agent({ ..., events });
API 参考
new Agent(options)
options.llm (必填) – LLMProvider 实例。

options.tools (可选) – ToolRegistry 实例。

options.memory (可选) – MemoryProvider 实例（默认为 InMemoryMemory）。

options.events (可选) – EventBus 实例。

options.maxIterations (可选) – 最大工具调用轮数，默认 5。

options.sessionId (可选) – 会话标识，用于记忆隔离，默认 'default'。

agent.run(userInput)
userInput – 用户输入字符串。

返回最终答案字符串。

agent.runStream(userInput)
返回异步迭代器，逐 token 输出生成内容。

toolRegistry.register(toolDefinition)
注册工具。

返回注册的工具实例。

memory.add(role, content, metadata)
新增消息到记忆。

memory.getLast(n, sessionId)
获取最近 n 条消息。

内置工具与插件
内置工具
searchTool – 简易网络搜索（基于 DuckDuckGo HTML 接口）。

calculatorTool – 基础数学表达式计算。

内置插件
loggerPlugin – 打印 Agent 运行日志（工具调用、会话记忆等）。

RAG（检索增强生成）
PithyAgent 提供基础 RAG 组件（插件级别，不强制依赖）：

EmbeddingProvider – 抽象嵌入接口。

InMemoryVectorStore – 内存向量存储。

TextSplitter – 文档分块。

完整示例参见 examples/rag-demo.js。

快速体验：

javascript
const { InMemoryVectorStore, TextSplitter } = require('pithyagent');
const embedding = new YourEmbeddingProvider(); // 可调用 Ollama embedding API
const vectorStore = new InMemoryVectorStore();
const splitter = new TextSplitter(500, 50);

const chunks = splitter.split('长文档内容...');
const vectors = await Promise.all(chunks.map(c => embedding.embed(c)));
await vectorStore.addVectors(vectors, chunks);

const queryVec = await embedding.embed('问题');
const retrieved = await vectorStore.similaritySearch(queryVec, 3);
// 将 retrieved 作为上下文注入用户输入
贡献指南
欢迎提交 PR。请保持核心代码精简（< 1000 行），新增功能优先以插件或独立模块形式提供。运行测试：

bash
npm test
许可
MIT © KunDaNbk

相关链接

GitHub 仓库：https://github.com/KunDaNbk/PithyAgent

npm 包：https://www.npmjs.com/package/pithyagent（待发布）

问题反馈：Issues

让 PithyAgent 框架轻量且好用的实现方法

