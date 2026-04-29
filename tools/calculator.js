// tools/calculator.js
/**
 * 基础计算器工具
 * 支持四则运算和数学表达式
 */

const calculatorTool = {
  name: 'calculator',
  description: '执行数学计算，支持 + - * / 和括号，例如 "2+3*4" 或 "(10-5)/2"。不能进行变量运算或代数。',
  parameters: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: '数学表达式，例如 "2+3*4"'
      }
    },
    required: ['expression']
  },
  execute: async ({ expression }) => {
    try {
      // 注意：eval 存在安全风险，但在受控环境中用于简单计算是方便的
      // 更好的做法是使用 math.js 或安全表达式解析库，这里为了轻量使用 Function 构造器
      // 移除可能的安全问题字符
      const sanitized = expression.replace(/[^0-9+\-*/()\.]/g, '');
      if (!sanitized) throw new Error('无效表达式');
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${sanitized})`)();
      if (isNaN(result) || !isFinite(result)) {
        return `表达式 ${expression} 计算结果无效。`;
      }
      return `计算结果：${result}`;
    } catch (err) {
      return `计算失败：${err.message}。请检查表达式格式。`;
    }
  }
};

module.exports = calculatorTool;