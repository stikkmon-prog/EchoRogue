import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { readDatasetState, writeDatasetState } from '../../../lib/persistence';
import { createEmbedding, splitTextIntoChunks } from '../../../lib/vector-store';
import {
  enforceRateLimit,
  MAX_TRAIN_SOURCE_SIZE,
  normalizeUrl,
  isPrivateHost,
  isUnsafeHost,
  isSupportedResponseContentType
} from '../../../lib/server-utils';

const allowedSources = ['txt', 'csv', 'url', 'mcp', 'kaggle', 'huggingface'] as const;

type AllowedSource = (typeof allowedSources)[number];
const isAllowedSourceType = (value: string): value is AllowedSource => {
  return allowedSources.includes(value as AllowedSource);
};

const ALLOWED_URL_CONTENT_TYPES = ['text/html', 'text/plain', 'application/xml', 'application/xhtml+xml'];
export const dynamic = 'force-dynamic';

const resolveUploadFile = async (sourceUrl: string) => {
  const root = path.join(process.cwd(), 'frontend');
  const publicDir = path.join(root, 'public');
  const candidate = path.join(publicDir, sourceUrl.replace(/^\//, ''));
  try {
    await fs.promises.access(candidate);
    return candidate;
  } catch {
    return null;
  }
};

const slicePreview = (text: string) => text.slice(0, 1200);

const isAllowedFileExtension = (sourceUrl: string, sourceType: string) => {
  const extension = path.extname(sourceUrl).toLowerCase();
  return (sourceType === 'txt' && extension === '.txt') || (sourceType === 'csv' && extension === '.csv');
};

export async function POST(request: Request) {
  const rateLimitError = enforceRateLimit(request, 'train', 4, 75_000);
  if (rateLimitError) return rateLimitError;

  const body = await request.json().catch(() => ({}));
  const sourceType = String(body.sourceType || '').trim().toLowerCase();
  const sourceUrl = String(body.sourceUrl || '').trim();
  const datasetName = String(body.datasetName || '').trim() || 'unnamed-dataset';

  if (!isAllowedSourceType(sourceType)) {
    return NextResponse.json({ error: 'Unsupported source type.' }, { status: 400 });
  }

  const store = await readDatasetState();
  const createdAt = new Date().toISOString();

  if (sourceType === 'url') {
    if (!sourceUrl) {
      return NextResponse.json({ error: 'A URL is required for URL ingestion.' }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(normalizeUrl(sourceUrl));
    } catch {
      return NextResponse.json({ error: 'Invalid URL for ingestion.' }, { status: 400 });
    }

    if (isPrivateHost(parsedUrl.hostname) || isUnsafeHost(parsedUrl.hostname)) {
      return NextResponse.json({ error: 'The source URL is not allowed for ingestion.' }, { status: 403 });
    }

    try {
      const response = await fetch(parsedUrl.toString(), {
        headers: { 'User-Agent': 'EchoRogue/1.0' },
        redirect: 'follow'
      });

      if (!response.ok) {
        return NextResponse.json({ error: `Request failed with status ${response.status}.` }, { status: 502 });
      }

      const contentType = response.headers.get('content-type');
      if (!isSupportedResponseContentType(contentType, ALLOWED_URL_CONTENT_TYPES)) {
        return NextResponse.json({ error: 'URL source must resolve to plain text or HTML content.' }, { status: 415 });
      }

      const contentLength = Number(response.headers.get('content-length') || '0');
      if (contentLength > MAX_TRAIN_SOURCE_SIZE) {
        return NextResponse.json({ error: 'Source URL content is too large to ingest safely.' }, { status: 413 });
      }

      let text = await response.text();
      if (text.length > MAX_TRAIN_SOURCE_SIZE) {
        text = text.slice(0, MAX_TRAIN_SOURCE_SIZE);
      }

      const chunks = splitTextIntoChunks(text);
      const items = chunks.map((chunk, index) => ({
        id: `${datasetName}-${index}-${Date.now()}`,
        text: chunk,
        source: parsedUrl.toString(),
        vector: createEmbedding(chunk)
      }));

      const entry = {
        name: datasetName,
        sourceType,
        sourceUrl: parsedUrl.toString(),
        createdAt,
        preview: slicePreview(text),
        items
      };

      const nextStore = { datasets: [entry, ...store.datasets.filter(d => d.name !== datasetName)] };
      await writeDatasetState(nextStore);
      return NextResponse.json({
        message: `Stored ${items.length} vector chunks from URL source for dataset '${datasetName}'.`,
        preview: slicePreview(text),
        dataset: entry
      });
    } catch (error) {
      return NextResponse.json({ error: `Could not fetch URL: ${String(error)}` }, { status: 500 });
    }
  }

  if (sourceType === 'txt' || sourceType === 'csv') {
    if (!sourceUrl) {
      return NextResponse.json({
        message: 'Text and CSV sources are supported via file upload. Upload the file first and then use the returned upload path.'
      });
    }

    if (!isAllowedFileExtension(sourceUrl, sourceType)) {
      return NextResponse.json({ error: `Uploaded source must be a .${sourceType} file.` }, { status: 415 });
    }

    const localPath = await resolveUploadFile(sourceUrl);
    if (!localPath) {
      return NextResponse.json({ error: 'Could not resolve uploaded file path. Use the returned upload URL from the file upload panel.' }, { status: 404 });
    }

    try {
      let text = await fs.promises.readFile(localPath, 'utf8');
      if (text.length > MAX_TRAIN_SOURCE_SIZE) {
        text = text.slice(0, MAX_TRAIN_SOURCE_SIZE);
      }

      const chunks = splitTextIntoChunks(text);
      const items = chunks.map((chunk, index) => ({
        id: `${datasetName}-${index}-${Date.now()}`,
        text: chunk,
        source: sourceUrl,
        vector: createEmbedding(chunk)
      }));

      const entry = {
        name: datasetName,
        sourceType,
        sourceUrl,
        createdAt,
        preview: slicePreview(text),
        items
      };

      const nextStore = { datasets: [entry, ...store.datasets.filter(d => d.name !== datasetName)] };
      await writeDatasetState(nextStore);
      return NextResponse.json({
        message: `Ingested ${items.length} text chunks from uploaded dataset '${datasetName}'.`,
        preview: slicePreview(text),
        dataset: entry
      });
    } catch (error) {
      return NextResponse.json({ error: `Could not read uploaded file: ${String(error)}` }, { status: 500 });
    }
  }

  if (sourceType === 'mcp' || sourceType === 'kaggle' || sourceType === 'huggingface') {
    if (!sourceUrl) {
      return NextResponse.json({ error: 'A source URL or repository path is required for this source type.' }, { status: 400 });
    }

    if (sourceUrl.length > 512) {
      return NextResponse.json({ error: 'Source URL is too long.' }, { status: 414 });
    }

    const entry = {
      name: datasetName,
      sourceType,
      sourceUrl,
      createdAt,
      preview: `Advanced ingestion queued for ${sourceType.toUpperCase()} source.`,
      items: []
    };

    const nextStore = { datasets: [entry, ...store.datasets.filter(d => d.name !== datasetName)] };
    await writeDatasetState(nextStore);
    return NextResponse.json({
      message: `Queued advanced ingestion for ${sourceType.toUpperCase()} source '${sourceUrl}'.`,
      preview: entry.preview,
      dataset: entry
    });
  }

  return NextResponse.json({ error: 'Unable to start training workflow.' }, { status: 500 });
}
