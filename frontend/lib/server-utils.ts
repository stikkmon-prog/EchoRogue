import { NextResponse } from 'next/server';

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^::1$/,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^169\.254\./,
  /^fc00:/i,
  /^fe80:/i
];
const UNSAFE_HOST_PATTERNS = [/(^localhost$)|\.local$|\.lan$|\.home$|\.internal$/i];

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export const MAX_UPLOAD_SIZE = 4 * 1024 * 1024;
export const MAX_TRAIN_SOURCE_SIZE = 250000;
export const MAX_BROWSER_CONTENT_SIZE = 250000;
export const ALLOWED_TEXT_MIME_TYPES = ['text/plain', 'text/csv', 'application/json'];
export const ALLOWED_HTML_MIME_TYPES = ['text/html', 'application/xhtml+xml', 'text/plain', 'application/xml'];
export const ALLOWED_UPLOAD_EXTENSIONS = ['.txt', '.csv', '.json'];

export const isPrivateHost = (hostname: string) => PRIVATE_HOST_PATTERNS.some(pattern => pattern.test(hostname));
export const isUnsafeHost = (hostname: string) => UNSAFE_HOST_PATTERNS.some(pattern => pattern.test(hostname));

export const getClientIp = (request: Request) => {
  const forwarded = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return 'anonymous';
};

export const enforceRateLimit = (request: Request, routeKey: string, maxRequests = 6, windowMs = 60_000) => {
  const client = getClientIp(request);
  const key = `${routeKey}:${client}`;
  const now = Date.now();
  const bucket = rateBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (bucket.count >= maxRequests) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    return NextResponse.json({ error: 'Rate limit exceeded. Try again later.', retryAfter }, { status: 429, headers: { 'Retry-After': String(retryAfter) } });
  }

  bucket.count += 1;
  return null;
};

export const normalizeUrl = (rawUrl: string) => {
  return rawUrl.trim().startsWith('http') ? rawUrl.trim() : `https://${rawUrl.trim()}`;
};

export const sanitizeTextPreview = (text: string, maxLength = 3200) => {
  return text
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
};

export const isAllowedUploadMimeType = (mimeType: string, fileName: string) => {
  const normalizedMime = mimeType.toLowerCase();
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
  return ALLOWED_TEXT_MIME_TYPES.includes(normalizedMime) || ALLOWED_UPLOAD_EXTENSIONS.includes(ext);
};

export const isAllowedUploadExtension = (fileName: string) => {
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
  return ALLOWED_UPLOAD_EXTENSIONS.includes(ext);
};

export const isSupportedResponseContentType = (contentType: string | null, allowedTypes: string[]) => {
  if (!contentType) return false;
  const normalized = contentType.toLowerCase();
  return allowedTypes.some(type => normalized.includes(type));
};
