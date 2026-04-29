// core/retriever.js
/**
 * 检索增强生成 (RAG) 基础组件
 * 提供向量存储、文档切块、检索接口
 */

class EmbeddingProvider {
  async embed(text) {
    throw new Error('Not implemented');
  }
}

class VectorStore {
  async addVectors(vectors, metadata) { throw new Error('Not implemented'); }
  async similaritySearch(vector, k) { throw new Error('Not implemented'); }
}

// 简易内存向量存储（基于余弦相似度）
class InMemoryVectorStore extends VectorStore {
  constructor() {
    super();
    this.vectors = []; // { vector, metadata }
  }
  async addVectors(vectors, metadataList) {
    for (let i = 0; i < vectors.length; i++) {
      this.vectors.push({ vector: vectors[i], metadata: metadataList[i] });
    }
  }
  async similaritySearch(queryVector, k) {
    // 计算点积（假设已归一化）
    const scores = this.vectors.map((v, idx) => ({
      idx,
      score: this._dot(queryVector, v.vector)
    }));
    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, k).map(s => this.vectors[s.idx].metadata);
  }
  _dot(a, b) {
    return a.reduce((sum, val, i) => sum + val * b[i], 0);
  }
}

// 文档分块器
class TextSplitter {
  constructor(chunkSize = 500, overlap = 50) {
    this.chunkSize = chunkSize;
    this.overlap = overlap;
  }
  split(text) {
    const chunks = [];
    let start = 0;
    while (start < text.length) {
      let end = Math.min(start + this.chunkSize, text.length);
      // 尽量在句号或换行处切割
      if (end < text.length) {
        const lastPeriod = text.lastIndexOf('.', end);
        if (lastPeriod > start) end = lastPeriod + 1;
      }
      chunks.push(text.slice(start, end));
      start = end - this.overlap;
      if (start < 0) start = 0;
    }
    return chunks;
  }
}

module.exports = {
  EmbeddingProvider,
  VectorStore,
  InMemoryVectorStore,
  TextSplitter
};