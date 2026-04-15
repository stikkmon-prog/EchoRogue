import { NextResponse } from 'next/server';
import { readDatasetState, writeDatasetState } from '../../../lib/persistence';
import { queryVectors } from '../../../lib/vector-store';
import { enforceRateLimit } from '../../../lib/server-utils';

export const dynamic = 'force-dynamic';
const datasetDetailCache = new Map<string, { response: unknown; cachedAt: number }>();
const DATASET_CACHE_TTL = 3 * 60 * 1000;

export async function GET(request: Request) {
  const rateLimitError = enforceRateLimit(request, 'dataset', 10, 30_000);
  if (rateLimitError) return rateLimitError;

  const state = await readDatasetState();
  const url = new URL(request.url);
  const datasetName = url.searchParams.get('name')?.trim();

  if (!datasetName) {
    const datasets = state.datasets.map(dataset => ({
      name: dataset.name,
      sourceType: dataset.sourceType,
      sourceUrl: dataset.sourceUrl,
      createdAt: dataset.createdAt,
      itemCount: dataset.items.length
    }));
    return NextResponse.json({ datasets });
  }

  const cached = datasetDetailCache.get(datasetName);
  if (cached && Date.now() - cached.cachedAt < DATASET_CACHE_TTL) {
    return NextResponse.json(cached.response);
  }

  const dataset = state.datasets.find(item => item.name === datasetName);
  if (!dataset) {
    return NextResponse.json({ error: `Dataset '${datasetName}' not found.` }, { status: 404 });
  }

  const response = {
    dataset: {
      name: dataset.name,
      sourceType: dataset.sourceType,
      sourceUrl: dataset.sourceUrl,
      createdAt: dataset.createdAt,
      itemCount: dataset.items.length,
      preview: dataset.preview
    },
    items: dataset.items.slice(0, 20).map(item => ({ id: item.id, text: item.text, source: item.source }))
  };
  datasetDetailCache.set(datasetName, { response, cachedAt: Date.now() });
  return NextResponse.json(response);
}

export async function POST(request: Request) {
  const rateLimitError = enforceRateLimit(request, 'dataset', 12, 45_000);
  if (rateLimitError) return rateLimitError;

  const body = await request.json().catch(() => ({}));
  const datasetName = String(body.datasetName || '').trim();
  const query = String(body.query || '').trim();
  const topK = Number(body.topK) || 5;

  if (!datasetName) {
    return NextResponse.json({ error: 'Dataset name is required.' }, { status: 400 });
  }
  if (!query) {
    return NextResponse.json({ error: 'Search query is required.' }, { status: 400 });
  }

  const state = await readDatasetState();
  const dataset = state.datasets.find(item => item.name === datasetName);
  if (!dataset) {
    return NextResponse.json({ error: `Dataset '${datasetName}' not found.` }, { status: 404 });
  }

  const results = queryVectors(query, dataset.items, topK);
  const response = {
    dataset: dataset.name,
    query,
    hits: results.map(item => ({ text: item.text, score: item.score, source: item.source }))
  };
  datasetDetailCache.delete(datasetName);
  return NextResponse.json(response);
}

export async function DELETE(request: Request) {
  const rateLimitError = enforceRateLimit(request, 'dataset', 4, 60_000);
  if (rateLimitError) return rateLimitError;

  const body = await request.json().catch(() => ({}));
  const datasetName = String(body.datasetName || '').trim();

  if (!datasetName) {
    return NextResponse.json({ error: 'Dataset name is required for deletion.' }, { status: 400 });
  }

  const state = await readDatasetState();
  const nextDatasets = state.datasets.filter(item => item.name !== datasetName);
  if (nextDatasets.length === state.datasets.length) {
    return NextResponse.json({ error: `Dataset '${datasetName}' not found.` }, { status: 404 });
  }

  await writeDatasetState({ datasets: nextDatasets });
  datasetDetailCache.delete(datasetName);
  return NextResponse.json({ message: `Dataset '${datasetName}' deleted successfully.` });
}
