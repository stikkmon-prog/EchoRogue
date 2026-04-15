import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { enforceRateLimit, MAX_UPLOAD_SIZE, isAllowedUploadMimeType, isAllowedUploadExtension } from '../../../lib/server-utils';

export const dynamic = 'force-dynamic';

// Uploaded files are stored in public/uploads by default so they can be referenced from the training workflow.
// If public is unavailable, the app falls back to a workspace-level uploads folder.

const findPublicDirectory = async () => {
  const root = process.cwd();
  const candidate = path.join(root, 'public');
  try {
    await fs.access(candidate);
    return candidate;
  } catch {
    const fallback = path.join(root, 'frontend', 'public');
    try {
      await fs.access(fallback);
      return fallback;
    } catch {
      return null;
    }
  }
};

const sanitizeFileName = (name: string) => {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
};

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
  }

  const rateLimitError = enforceRateLimit(request, 'upload', 5, 60_000);
  if (rateLimitError) return rateLimitError;

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > MAX_UPLOAD_SIZE) {
    return NextResponse.json({ error: `File upload exceeds the ${MAX_UPLOAD_SIZE / 1024 / 1024}MB limit.` }, { status: 413 });
  }

  if (!isAllowedUploadMimeType(file.type || '', file.name) || !isAllowedUploadExtension(file.name)) {
    return NextResponse.json({ error: 'Unsupported file type. Upload .txt, .csv, or .json files only.' }, { status: 415 });
  }

  const publicDir = await findPublicDirectory();
  const saveDir = publicDir ? path.join(publicDir, 'uploads') : path.join(process.cwd(), 'uploads');
  await fs.mkdir(saveDir, { recursive: true });

  const safeName = sanitizeFileName(file.name);
  const filePath = path.join(saveDir, safeName);
  await fs.writeFile(filePath, buffer);

  const preview = file.type.startsWith('text/') || safeName.endsWith('.txt') || safeName.endsWith('.csv') ? buffer.toString('utf8', 0, 1200).replace(/\0/g, '') : undefined;
  const downloadUrl = publicDir ? `/uploads/${safeName}` : `uploads/${safeName}`;

  return NextResponse.json({ fileName: safeName, size: buffer.byteLength, downloadUrl, preview });
}
