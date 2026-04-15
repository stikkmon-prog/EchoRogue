import { describe, expect, it } from 'vitest';
import { createEmbedding, cosineSimilarity, splitTextIntoChunks, queryVectors } from '../lib/vector-store';

describe('vector-store utilities', () => {
  it('creates normalized embeddings with consistent dimension', () => {
    const result = createEmbedding('hello world');
    expect(result).toHaveLength(128);
    const magnitude = Math.sqrt(result.reduce((sum, value) => sum + value * value, 0));
    expect(magnitude).toBeGreaterThan(0);
    expect(Math.abs(magnitude - 1)).toBeLessThan(1e-6);
  });

  it('computes cosine similarity between similar vectors', () => {
    const a = createEmbedding('open source project');
    const b = createEmbedding('open-source project');
    expect(cosineSimilarity(a, b)).toBeGreaterThan(0);
  });

  it('splits text into smaller chunks when needed', () => {
    const chunks = splitTextIntoChunks(
      'This is one sentence. This is another sentence. And a third sentence.',
      20
    );
    expect(chunks.length).toBeGreaterThanOrEqual(2);
  });

  it('returns the top matching items using queryVectors', () => {
    const items = [
      { text: 'apple banana', vector: createEmbedding('apple banana') },
      { text: 'banana orange', vector: createEmbedding('banana orange') },
      { text: 'carrot potato', vector: createEmbedding('carrot potato') }
    ];
    const results = queryVectors('fresh apple', items, 2);
    expect(results.length).toBe(2);
    expect(results[0].text).toBe('apple banana');
  });
});
