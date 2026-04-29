# PithyAgent 使用文档

\[\!\[npm version\]\(https://img\.shields\.io/badge/npm\-v0\.3\.0\-blue\)\]\(https://www\.npmjs\.com/package/pithyagent\) \[\!\[License: MIT\]\(https://img\.shields\.io/badge/License\-MIT\-yellow\.svg\)\]\(https://opensource\.org/licenses/MIT\)

# PithyAgent 简介

\*\*PithyAgent\*\* 是一个 \*\*极轻量、零黑盒、完全可控\*\* 的 Node\.js Agent 框架，专为本地大模型（LM Studio / Ollama）设计，支持工具调用、多轮记忆、RAG 检索和流式输出。核心代码 \&lt; 500 行，无冗余依赖，上手简单且灵活可扩展。

## 核心特性

- \*\*零黑盒\*\* – 所有 API 调用显式清晰，无隐藏缓存与隐式重试，调试更便捷。

- \*\*本地优先\*\* – 专为 LM Studio、Ollama 等本地推理服务优化，同时兼容 OpenAI API，适配多种使用场景。

- \*\*轻量透明\*\* – 核心代码精简，用户可完全掌控执行循环，调试、扩展、修改轻松自如。

- \*\*功能完备\*\* – 工具调用、多轮记忆、RAG 检索与流式输出一应俱全，满足各类 AI 智能体开发需求。

# 安装指南

支持两种安装方式，可根据需求选择：

## 方式一：npm 安装（推荐）

```bash
npm install pithyagent
```

## 方式二：克隆仓库使用

```bash
git clone https://github.com/KunDaNbk/PithyAgent.git
cd PithyAgent
npm install   # 仅用于开发测试，运行时无强制依赖
```

# 快速开始

以下示例覆盖最常用场景，复制即可运行（需提前启动对应本地大模型）。

## 1\. 基础对话（无工具）

适用于简单的多轮对话，支持会话记忆功能。

```javascript
const { Agent, LMStudioLLM, InMemoryMemory } = require('pithyagent');

// 初始化本地大模型（LM Studio），可替换为 OllamaLLM
const llm = new LMStudioLLM({ model: 'qwen3-8b' });
// 初始化内存记忆（重启后丢失，适合调试）
const memory = new InMemoryMemory();
// 创建智能体实例
const agent = new Agent({ llm, memory });

// 运行对话（需放在异步函数中）
async function basicChat() {
  const answer = await agent.run('你好，请介绍一下自己');
  console.log(answer); // 输出大模型回复
}
basicChat();
```

## 2\. 带工具的 Agent（天气查询示例）

演示如何注册工具，实现 AI 自动调用工具完成任务。

```javascript
const { Agent, OllamaLLM, ToolRegistry, InMemoryMemory } = require('pithyagent');

// 初始化本地大模型（Ollama）
const llm = new OllamaLLM({ model: 'qwen2.5:7b' });
// 初始化工具注册器
const tools = new ToolRegistry();

// 注册天气查询工具
tools.register({
  name: 'get_weather', // 工具名称（唯一）
  description: '查询指定城市的天气情况，需传入城市名称', // 工具描述（AI 用于判断是否调用）
  parameters: {
    type: 'object',
    properties: { 
      city: { type: 'string', description: '要查询天气的城市名称' } 
    },
    required: ['city'] // 必传参数
  },
  // 工具执行逻辑（真实场景可对接第三方天气 API）
  execute: async ({ city }) => `${city} 今天多云，22℃，微风`
});

// 创建带工具的智能体
const agent = new Agent({ llm, tools, memory: new InMemoryMemory() });

// 运行查询（AI 会自动调用 get_weather 工具）
async function toolChat() {
  const answer = await agent.run('北京天气怎么样？');
  console.log(answer);
}
toolChat();
```

## 3\. 流式输出（打字机效果）

适用于需要实时展示回复的场景，仅支持纯对话，不处理工具调用。

```javascript
const { Agent, OpenAICompatibleLLM } = require('pithyagent');

// 初始化 OpenAI 兼容接口（可适配本地大模型的 OpenAI 兼容服务）
const llm = new OpenAICompatibleLLM({ apiUrl: 'http://localhost:1234/v1' });
const agent = new Agent({ llm });

// 流式输出回复
async function streamChat() {
  for await (const chunk of agent.runStream('讲一个短笑话')) {
    process.stdout.write(chunk); // 逐字打印回复
  }
}
streamChat();
```

## 4\. 持久化记忆（SQLite）

将对话记忆保存到本地文件，重启程序后仍可恢复会话。

```javascript
const { Agent, OllamaLLM, SQLiteMemory } = require('pithyagent');

// 初始化 SQLite 记忆（保存到本地 conversations.db 文件，user-123 为会话ID）
const memory = new SQLiteMemory('./conversations.db', 'user-123');
const agent = new Agent({ llm: new OllamaLLM(), memory });

// 测试持久化记忆
async function persistentMemory() {
  await agent.run('我叫张三');
  const reply = await agent.run('我叫什么名字？'); // AI 可回忆起之前的对话
  console.log(reply); // 输出：你叫张三
}
persistentMemory();
```

# 核心概念

## 1\. LLM（大模型客户端）

大模型抽象层，支持任意 OpenAI 兼容 API，内置 4 种客户端，可直接使用：

- `LMStudioLLM`：适配 LM Studio，默认地址 `http://localhost:1234/v1`

- `OllamaLLM`：适配 Ollama，默认地址`http://localhost:11434/v1`

- `OpenAILLM`：适配 OpenAI 官方 API，需传入 API Key

- `OpenAICompatibleLLM`：通用配置，可自定义 apiUrl、modelName 等，适配各类 OpenAI 兼容服务

初始化示例：

```javascript
new LMStudioLLM({ 
  model: 'qwen3-8b',  // 模型名称
  temperature: 0.7,   // 随机性，0~1 之间
  maxTokens: 1000     // 最大生成 tokens 数
});
```

## 2\. Tool（工具）

工具是 AI 可调用的功能模块，由「名称、描述、参数 Schema、执行函数」四部分组成，框架会自动生成 OpenAI tools 参数，由大模型判断何时调用。

工具注册通用示例（计算器工具）：

```javascript
const { ToolRegistry } = require('pithyagent');
const tools = new ToolRegistry();

tools.register({
  name: 'calculator', // 工具名称
  description: '执行简单的数学计算，支持加减乘除、幂运算等', // 工具描述（务必清晰，影响 AI 调用判断）
  parameters: {
    type: 'object',
    properties: { 
      expr: { type: 'string', description: '数学表达式，例如 1+1、2^3' } 
    },
    required: ['expr'] // 必传参数
  },
  execute: async ({ expr }) => {
    // 注意：生产环境请使用安全的表达式解析库（如 math.js），避免 eval 存在的安全风险
    return eval(expr).toString();
  }
});
```

## 3\. Memory（记忆）

负责存储对话历史，内置两种记忆方式，可根据场景选择：

- `InMemoryMemory`：进程内存储，重启程序后记忆丢失，适合本地调试、临时会话。

- `SQLiteMemory`：持久化到本地 SQLite 文件，支持多会话隔离，适合生产环境。

初始化示例：

```javascript
// SQLite 记忆初始化（文件路径 + 会话ID）
const memory = new SQLiteMemory('./chat.db', 'sessionId-001');
```

## 4\. Agent（智能体）

PithyAgent 的核心执行器，整合 LLM、工具、记忆、事件总线等模块，提供对话和工具调用的核心能力。

### 核心方法

- `run\(userInput\)`：自动处理工具调用循环，返回完整答案（支持多轮对话、工具调用）。

- `runStream\(userInput\)`：流式输出回复，逐 token 返回（不支持工具调用，仅用于纯对话）。

- `reset\(\)`：清空当前会话的记忆，重置智能体状态。

### 配置选项

```javascript
const agent = new Agent({
  llm,                 // LLM 实例（必填，无默认值）
  tools,               // ToolRegistry 实例（可选，默认无工具）
  memory,              // Memory 实例（可选，默认 InMemoryMemory）
  events,              // EventBus 实例（可选，用于监听生命周期）
  maxIterations: 5,    // 最大工具调用轮数（可选，默认 5，防止无限循环）
  sessionId: 'default' // 会话标识（可选，默认 'default'，用于多会话隔离）
});
```

## 5\. EventBus（事件总线）

用于监听智能体的生命周期事件，方便实现日志打印、监控、限流等功能，支持 3 种核心事件。

### 支持的事件

- `before\-run`：用户输入后，智能体开始处理前触发。

- `before\-tool\-execution`：智能体调用工具前触发。

- `after\-run`：智能体返回最终答案后触发。

### 使用示例

```javascript
const { EventBus } = require('pithyagent');
const events = new EventBus();

// 监听用户输入事件（打印用户输入）
events.on('before-run', ({ userInput }) => {
  console.log(`[用户输入]：${userInput}`);
});

// 监听工具调用事件（打印工具名称和参数）
events.on('before-tool-execution', ({ toolName, params }) => {
  console.log(`[工具调用]：${toolName}，参数：${JSON.stringify(params)}`);
});

// 监听对话结束事件（打印最终回复）
events.on('after-run', ({ answer }) => {
  console.log(`[AI 回复]：${answer}`);
});

// 创建带事件监听的智能体
const agent = new Agent({ llm, events });
```

# API 参考

## 1\. new Agent\(options\)

创建智能体实例，参数说明如下：

- `options\.llm`（必填）：LLMProvider 实例，即大模型客户端实例。

- `options\.tools`（可选）：ToolRegistry 实例，注册的工具集合。

- `options\.memory`（可选）：MemoryProvider 实例，默认使用 InMemoryMemory。

- `options\.events`（可选）：EventBus 实例，用于监听生命周期事件。

- `options\.maxIterations`（可选）：最大工具调用轮数，默认 5。

- `options\.sessionId`（可选）：会话标识，默认 \&\#39;default\&\#39;，用于多会话记忆隔离。

## 2\. agent\.run\(userInput\)

- `userInput`：用户输入的字符串（对话内容、查询需求等）。

- 返回值：Promise 对象，resolve 后得到智能体的完整回复字符串。

## 3\. agent\.runStream\(userInput\)

- `userInput`：用户输入的字符串（仅支持纯对话，不支持工具调用）。

- 返回值：异步迭代器，可通过 for await\.\.\.of 逐 token 获取回复。

## 4\. toolRegistry\.register\(toolDefinition\)

- `toolDefinition`：工具定义对象（包含 name、description、parameters、execute 四个核心属性）。

- 返回值：注册成功的工具实例。

## 5\. memory\.add\(role, content, metadata\)

- `role`：角色标识（如 \&\#39;user\&\#39; 表示用户，\&\#39;assistant\&\#39; 表示 AI）。

- `content`：消息内容（用户输入或 AI 回复）。

- `metadata`（可选）：消息元数据（如时间戳、会话ID等）。

- 功能：手动新增消息到记忆中。

## 6\. memory\.getLast\(n, sessionId\)

- `n`：要获取的最近消息条数。

- `sessionId`（可选）：会话标识，默认使用智能体的 sessionId。

- 返回值：最近 n 条消息的数组。

# 内置工具与插件

## 1\. 内置工具

框架内置 2 种常用工具，可直接导入使用，无需额外注册：

- `searchTool`：简易网络搜索工具，基于 DuckDuckGo HTML 接口，可用于获取实时网络信息。

- `calculatorTool`：基础数学计算工具，支持常见的数学表达式运算。

使用示例：

```javascript
const { Agent, OllamaLLM, searchTool, calculatorTool, ToolRegistry } = require('pithyagent');

const tools = new ToolRegistry();
// 导入内置工具
tools.register(searchTool);
tools.register(calculatorTool);

const agent = new Agent({ llm: new OllamaLLM(), tools });
// 测试内置工具
agent.run('2的10次方是多少？'); // 调用 calculatorTool
agent.run('今天的热点新闻有哪些？'); // 调用 searchTool
```

## 2\. 内置插件

- `loggerPlugin`：日志打印插件，可自动打印智能体的运行日志（工具调用、会话记忆、事件触发等），便于调试。

# RAG（检索增强生成）

PithyAgent 提供基础 RAG 组件（插件级别，不强制依赖），可实现文档检索与问答，解决大模型上下文有限、知识滞后的问题。

## 核心 RAG 组件

- `EmbeddingProvider`：抽象嵌入接口，用于将文本转换为向量（可对接 Ollama embedding API 等）。

- `InMemoryVectorStore`：内存向量存储，用于存储文本向量，支持相似性检索。

- `TextSplitter`：文档分块工具，将长文档分割为固定长度的片段，避免向量嵌入时的长度限制。

注：完整 RAG 示例文档 [examples/rag\-demo\.js](https://github.com/KunDaNbk/PithyAgent/blob/main/examples/rag-demo.js) 暂无法解析，以下为基础使用示例。

## RAG 快速体验

```javascript
const { InMemoryVectorStore, TextSplitter } = require('pithyagent');

// 1. 初始化组件（需自行实现或导入 EmbeddingProvider）
const embedding = new YourEmbeddingProvider(); // 可对接 Ollama embedding API
const vectorStore = new InMemoryVectorStore();
// 文档分块配置（每块 500 字符，重叠 50 字符，避免上下文断裂）
const splitter = new TextSplitter(500, 50);

// 2. 处理长文档（分块 → 生成向量 → 存储）
const longText = '这里是需要处理的长文档内容...'; // 替换为你的长文档
const chunks = splitter.split(longText); // 文档分块
const vectors = await Promise.all(chunks.map(chunk => embedding.embed(chunk))); // 生成向量
await vectorStore.addVectors(vectors, chunks); // 向量存储

// 3. 相似性检索（根据问题获取相关文档片段）
const query = '你的问题是什么？'; // 替换为用户查询
const queryVec = await embedding.embed(query);
const retrievedChunks = await vectorStore.similaritySearch(queryVec, 3); // 获取前 3 个相关片段

// 4. 将检索到的片段作为上下文，注入用户输入，调用大模型生成答案
const prompt = `根据以下上下文回答问题：\n${retrievedChunks.join('\n')}\n问题：${query}`;
const agent = new Agent({ llm: new OllamaLLM() });
const answer = await agent.run(prompt);
console.log(answer);
```

# 贡献指南

欢迎各位开发者提交 PR，共同完善 PithyAgent 框架，贡献需遵循以下规范：

- 保持核心代码精简，确保核心代码行数 \&lt; 1000 行。

- 新增功能优先以插件或独立模块形式提供，避免修改核心代码。

- 提交代码前需运行测试，确保功能正常：

```bash
npm test
```

# 许可协议

PithyAgent 采用 MIT 许可协议，允许自由使用、复制、修改、合并、发布、分发、再许可和/或出售软件的副本，需保留原版权声明和许可声明。

详细协议：[MIT License](https://opensource.org/licenses/MIT) © [KunDaNbk](https://github.com/KunDaNbk)

# 相关链接

- GitHub 仓库：[https://github\.com/KunDaNbk/PithyAgent](https://github.com/KunDaNbk/PithyAgent)

- npm 包：[https://www\.npmjs\.com/package/pithyagent](https://www.npmjs.com/package/pithyagent)（待发布）

- 问题反馈：[Issues](https://github.com/KunDaNbk/PithyAgent/issues)（当前无开放问题）

- 扩展阅读：[让 PithyAgent 框架轻量且好用的实现方法](https://github.com/KunDaNbk/PithyAgent/blob/main/让 PithyAgent 框架轻量且好用的实现方法.md)

# 注意事项

- 部分链接（如 npm 包、RAG 示例文档）暂无法正常解析，可关注 GitHub 仓库获取最新更新。

- 工具执行函数中，避免使用 eval 等存在安全风险的方法，生产环境建议使用安全的第三方库。

- 流式输出（runStream）不支持工具调用，仅适用于纯对话场景。

- 使用本地大模型时，需提前启动对应服务（如 Ollama、LM Studio），确保地址与客户端配置一致。
