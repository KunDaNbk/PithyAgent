// index.js - PithyAgent 框架入口
const { LLMProvider, OpenAICompatibleLLM } = require('./core/llm');
const { Tool, ToolRegistry } = require('./core/tool');
const { MemoryProvider, InMemoryMemory } = require('./core/memory');
const { Agent } = require('./core/agent');
const { EventBus } = require('./core/event');
const { LMStudioLLM } = require('./providers/llm/lmstudio');
const { OpenAILLM } = require('./providers/llm/openai');
const { OllamaLLM } = require('./providers/llm/ollama');
const { SQLiteMemory } = require('./providers/memory/sqlite');
const searchTool = require('./tools/search');
const calculatorTool = require('./tools/calculator');
const loggerPlugin = require('./plugins/logger');

module.exports = {
  // 核心
  Agent,
  Tool,
  ToolRegistry,
  LLMProvider,
  OpenAICompatibleLLM,
  MemoryProvider,
  InMemoryMemory,
  EventBus,
  // 提供商
  LMStudioLLM,
  OpenAILLM,
  OllamaLLM,
  SQLiteMemory,
  // 内置工具
  searchTool,
  calculatorTool,
  // 内置插件
  loggerPlugin,
};