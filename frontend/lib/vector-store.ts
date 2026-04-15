const VECTOR_DIMENSIONS = 128;
const TOKEN_SPLIT = /[\s.,;:\-_/\\()\[\]{}"'`]+/;

const hashToken = (token: string) => {
  let hash = 2166136261;
  for (let i = 0; i < token.length; i += 1) {
    hash ^= token.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash);
};

export const createEmbedding = (text: string): number[] => {
  const vector = new Array(VECTOR_DIMENSIONS).fill(0);
  const tokens = text.toLowerCase().split(TOKEN_SPLIT).filter(Boolean);
  for (const token of tokens) {
    const index = hashToken(token) % VECTOR_DIMENSIONS;
    vector[index] += 1;
  }
  const length = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return length === 0 ? vector : vector.map(value => value / length);
};

export const cosineSimilarity = (a: number[], b: number[]): number => {
  if (a.length !== b.length) {
    return 0;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

export const splitTextIntoChunks = (text: string, maxChunkSize = 500): string[] => {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if (current.length + sentence.length > maxChunkSize && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
      continue;
    }
    current += `${sentence} `;
  }

  if (current.trim().length > 0) {
    chunks.push(current.trim());
  }

  return chunks.length > 0 ? chunks : [text.slice(0, maxChunkSize)];
};

export const queryVectors = <T extends { text: string; vector: number[] }>(query: string, items: T[], topK = 5) => {
  const queryVector = createEmbedding(query);
  return items
    .map(item => ({
      ...item,
      score: cosineSimilarity(queryVector, item.vector)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
};
