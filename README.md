# PithyAgent 使用文档

**Version**: 0\.2\.0

**License**: MIT

**GitHub**: [https://github\.com/pithyagent/pithyagent](https://github.com/pithyagent/pithyagent)

PithyAgent 是一个**极轻量、零黑盒、完全可控**的 Node\.js Agent 框架，专为本地大模型（LM Studio / Ollama）设计，支持工具调用、多轮记忆、RAG 检索和流式输出。核心代码 \&lt; 500 行，无冗余依赖。

---

## 1\. 安装

```bash
npm install pithyagent
```

或克隆仓库直接使用：

```bash
git clone https://github.com/pithyagent/pithyagent.git
cd pithyagent
npm install   # 仅用于开发测试，运行时无强制依赖
```

## 2\. 快速开始

### 2\.1 基础对话（无工具）

```javascript
const { Agent, LMStudioLLM, InMemoryMemory } = require('pithyagent');

const llm = new LMStudioLLM({ model: 'qwen3-8b' });
const memory = new InMemoryMemory();
const agent = new Agent({ llm, memory });

const answer = await agent.run('你好，请介绍一下自己');
console.log(answer);
```

### 2\.2 带工具的 Agent（天气查询）

```javascript
const { Agent, OllamaLLM, ToolRegistry, Tool, InMemoryMemory } = require('pithyagent');

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
```

### 2\.3 流式输出（无工具调用）

```javascript
const { Agent, OpenAICompatibleLLM } = require('pithyagent');

const llm = new OpenAICompatibleLLM({ apiUrl: 'http://localhost:1234/v1' });
const agent = new Agent({ llm });

for await (const chunk of agent.runStream('讲一个短笑话')) {
  process.stdout.write(chunk);
}
```

### 2\.4 持久化记忆（SQLite）

```javascript
const { Agent, OllamaLLM, SQLiteMemory } = require('pithyagent');

const memory = new SQLiteMemory('./conversations.db', 'user-123');
const agent = new Agent({ llm: new OllamaLLM(), memory });

await agent.run('我叫张三');
await agent.run('我叫什么名字？'); // 能回忆起
```

## 3\. 核心概念

### 3\.1 LLM（大模型客户端）

抽象层，支持任意 OpenAI 兼容 API。内置提供：

- LMStudioLLM（默认 http://localhost:1234/v1）

- OllamaLLM（默认 http://localhost:11434/v1）

- OpenAILLM（需要 API Key）

- OpenAICompatibleLLM（通用配置）

常用参数：

```javascript
new LMStudioLLM({ model: 'qwen3-8b', temperature: 0.7, maxTokens: 1000 });
```

### 3\.2 Tool（工具）

工具由 名称、描述、参数 Schema、执行函数 构成。框架自动生成 OpenAI tools 参数，模型决定何时调用。

注册示例：

```javascript
const { ToolRegistry, Tool } = require('pithyagent');
const tools = new ToolRegistry();
tools.register({
  name: 'calculator',
  description: '执行数学计算',
  parameters: { type: 'object', properties: { expr: { type: 'string' } } },
  execute: async ({ expr }) => eval(expr) + ''
});
```

### 3\.3 Memory（记忆）

负责存储对话历史。内置：

- InMemoryMemory：进程内存储，重启丢失。

- SQLiteMemory：持久化到文件，支持多会话。

```javascript
const memory = new SQLiteMemory('./chat.db', 'sessionId');
```

### 3\.4 Agent（智能体）

核心执行器。支持：

- run\(userInput\)：自动处理工具调用循环，返回完整答案。

- runStream\(userInput\)：流式输出（不处理工具调用，仅生成文本）。

- reset\(\)：清空当前会话记忆。

配置选项：

```javascript
const agent = new Agent({
  llm,          // LLM 实例
  tools,        // ToolRegistry 实例（可选）
  memory,       // Memory 实例（可选，默认 InMemoryMemory）
  events,       // EventBus 实例（可选）
  maxIterations: 5,      // 最大工具调用轮数
  sessionId: 'default'
});
```

### 3\.5 EventBus（事件总线）

用于监听 Agent 生命周期，方便日志、监控、限流等插件开发。

支持的事件：

- before\-run：用户输入后，开始处理前。

- before\-tool\-execution：执行工具前。

- after\-run：返回最终答案后。

示例：

```javascript
const { EventBus } = require('pithyagent');
const events = new EventBus();
events.on('before-run', ({ userInput }) => console.log(`User: ${userInput}`));
const agent = new Agent({ ..., events });
```

## 4\. RAG（检索增强生成）

PithyAgent 提供基础 RAG 组件（插件级别，不强制依赖）：

- EmbeddingProvider：抽象嵌入接口。

- InMemoryVectorStore：内存向量存储。

- TextSplitter：文档分块。

完整示例见 examples/rag\-demo\.js。

快速体验：

```javascript
const { InMemoryVectorStore, TextSplitter } = require('pithyagent');
const embedding = new YourEmbeddingProvider(); // 需自行实现（可调用 Ollama embedding API）
const vectorStore = new InMemoryVectorStore();
const splitter = new TextSplitter(500, 50);

const chunks = splitter.split('长文档...');
const vectors = await Promise.all(chunks.map(c => embedding.embed(c)));
await vectorStore.addVectors(vectors, chunks);

const queryVec = await embedding.embed('问题');
const retrieved = await vectorStore.similaritySearch(queryVec, 3);
// 将 retrieved 作为上下文注入用户输入
```

## 5\. 扩展开发

### 5\.1 自定义 LLM 提供商

继承 LLMProvider，实现 chat 和 chatStream 方法。

```javascript
const { LLMProvider } = require('pithyagent');
class MyLLM extends LLMProvider {
  async chat(messages, options) { /* ... */ }
  async chatStream(messages, options) { /* ... */ }
}
```

### 5\.2 自定义工具

按 Tool 格式注册即可，工具可异步执行任何任务（读文件、查数据库、调 API）。

### 5\.3 自定义记忆后端

继承 MemoryProvider，实现 add、getLast、getAll、clear 方法。

### 5\.4 插件

利用 EventBus 挂载钩子函数。

## 6\. 常见问题

**Q：LM Studio 需要额外配置吗？**

A：只需在 LM Studio 中加载模型，然后开启 Local Inference Server（默认端口 1234）。

**Q：Ollama 需要安装吗？**

A：需要。安装 Ollama 后执行 ollama pull qwen2\.5:7b，框架自动连接 http://localhost:11434/v1。

**Q：如何调试工具调用？**

A：使用 loggerPlugin 可打印每次工具调用的名称和参数。

```javascript
const { loggerPlugin } = require('pithyagent');
loggerPlugin(agent, agent.events);
```

**Q：流式输出时能同时使用工具吗？**

A：当前 runStream 简化实现不支持工具调用。若需工具调用，请使用 run 方法。

**Q：RAG 中向量存储只支持内存吗？**

A：目前内置内存版本。生产环境可替换为 Redis、Faiss 或 SQLite 向量扩展（需自行实现）。

## 7\. 路线图

- 核心 Agent 循环与工具调用

- 记忆（内存 \+ SQLite）

- 流式输出

- RAG 基础组件

- TypeScript 类型定义

- 更多内置工具（文件读写、HTTP 请求）

- 工作流 DAG（借鉴 LangGraph，但保持轻量）

## 8\. 贡献指南

欢迎提交 PR。请保持核心代码精简（\&lt; 1000 行），新增功能优先以插件或独立模块形式提供。运行测试：

```bash
npm test
```

## 9\. License

MIT © PithyAgent Contributors

注意：提供的 GitHub 链接（https://github\.com/pithyagent/pithyagent、https://github\.com/pithyagent/pithyagent\.git）目前均出现网页解析失败情况，可能是不支持的网页类型，建议检查网页链接或稍后重试。
