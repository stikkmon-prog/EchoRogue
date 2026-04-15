import { NextResponse } from 'next/server';
import {
  enforceRateLimit,
  MAX_BROWSER_CONTENT_SIZE,
  normalizeUrl,
  sanitizeTextPreview,
  isPrivateHost,
  isUnsafeHost,
  isSupportedResponseContentType,
  ALLOWED_HTML_MIME_TYPES
} from '../../../lib/server-utils';

export const dynamic = 'force-dynamic';

const browserCache = new Map<string, { url: string; title: string; preview: string; status: number; contentType: string; fetchedAt: number }>();
const BROWSER_CACHE_TTL = 5 * 60 * 1000;

export async function POST(request: Request) {
  const rateLimitError = enforceRateLimit(request, 'browser', 8, 45_000);
  if (rateLimitError) return rateLimitError;

  const body = await request.json().catch(() => ({}));
  const rawUrl = String(body.url || '').trim();

  if (!rawUrl) {
    return NextResponse.json({ error: 'No URL provided.' }, { status: 400 });
  }

  if (rawUrl.length > 2048) {
    return NextResponse.json({ error: 'URL is too long.' }, { status: 414 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(normalizeUrl(rawUrl));
  } catch {
    return NextResponse.json({ error: 'Invalid URL.' }, { status: 400 });
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return NextResponse.json({ error: 'Only HTTP and HTTPS URLs are supported.' }, { status: 400 });
  }

  const hostname = parsedUrl.hostname;
  if (isPrivateHost(hostname) || isUnsafeHost(hostname)) {
    return NextResponse.json({ error: 'URL is not allowed for security reasons.' }, { status: 403 });
  }

  const cacheKey = parsedUrl.toString();
  const cached = browserCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < BROWSER_CACHE_TTL) {
    return NextResponse.json(cached);
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
    if (!isSupportedResponseContentType(contentType, ALLOWED_HTML_MIME_TYPES)) {
      return NextResponse.json({ error: 'Unsupported content type; only HTML/text pages are allowed.' }, { status: 415 });
    }

    const contentLength = Number(response.headers.get('content-length') || '0');
    if (contentLength > MAX_BROWSER_CONTENT_SIZE) {
      return NextResponse.json({ error: 'Page is too large to fetch safely.', status: 413 }, { status: 413 });
    }

    const html = await response.text();
    const preview = sanitizeTextPreview(html, MAX_BROWSER_CONTENT_SIZE);
    const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : parsedUrl.hostname;
    const result = {
      url: parsedUrl.toString(),
      title,
      preview,
      status: response.status,
      contentType: contentType || 'unknown',
      fetchedAt: Date.now()
    };

    browserCache.set(cacheKey, result);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: `Failed to fetch page: ${String(error)}` }, { status: 500 });
  }
}
