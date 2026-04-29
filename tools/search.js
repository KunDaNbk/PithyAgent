// tools/search.js
/**
 * 通用网络搜索工具（基于 DuckDuckGo 或本地 SearXNG）
 * 简化版本，直接使用 fetch 请求搜索引擎
 */

const searchTool = {
  name: 'web_search',
  description: '搜索互联网获取实时信息。当用户询问新闻、天气、最新事件等需要联网的信息时使用。',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: '搜索关键词，应尽量具体准确'
      }
    },
    required: ['query']
  },
  execute: async ({ query }) => {
    // 方案1：使用 DuckDuckGo HTML 接口（无需 API Key）
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      const html = await response.text();
      // 简单正则提取结果标题和摘要（可根据实际情况增强）
      const results = [];
      const titleRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g;
      const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([^<]*)<\/a>/g;
      let match;
      while ((match = titleRegex.exec(html)) !== null && results.length < 5) {
        const link = match[1];
        const title = match[2];
        // 获取对应的摘要（近似匹配索引，简单实现）
        const snippetMatch = snippetRegex.exec(html);
        const snippet = snippetMatch ? snippetMatch[1] : '';
        results.push({ title, link, snippet });
      }
      if (results.length === 0) {
        return `未找到关于“${query}”的相关搜索结果。`;
      }
      return JSON.stringify(results);
    } catch (err) {
      return `搜索失败：${err.message}`;
    }
  }
};

module.exports = searchTool;