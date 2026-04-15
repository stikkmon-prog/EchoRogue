import { describe, expect, it } from 'vitest';
import { isPrivateHost, isUnsafeHost, sanitizeTextPreview, isAllowedUploadMimeType, isAllowedUploadExtension } from '../lib/server-utils';

describe('server-utils validation helpers', () => {
  it('detects private network hostnames', () => {
    expect(isPrivateHost('127.0.0.1')).toBe(true);
    expect(isPrivateHost('192.168.1.5')).toBe(true);
    expect(isPrivateHost('example.com')).toBe(false);
  });

  it('detects unsafe local hostnames', () => {
    expect(isUnsafeHost('machine.local')).toBe(true);
    expect(isUnsafeHost('test.lan')).toBe(true);
    expect(isUnsafeHost('example.com')).toBe(false);
  });

  it('sanitizes preview text and removes scripts', () => {
    const preview = sanitizeTextPreview('<script>alert(1)</script><p>Hello world</p>');
    expect(preview).toBe('Hello world');
  });

  it('allows valid upload file extensions and mime types', () => {
    expect(isAllowedUploadExtension('data.txt')).toBe(true);
    expect(isAllowedUploadExtension('dataset.csv')).toBe(true);
    expect(isAllowedUploadExtension('config.json')).toBe(true);
    expect(isAllowedUploadMimeType('text/plain', 'data.txt')).toBe(true);
    expect(isAllowedUploadMimeType('application/json', 'config.json')).toBe(true);
  });

  it('rejects unsupported upload file types', () => {
    expect(isAllowedUploadExtension('archive.zip')).toBe(false);
    expect(isAllowedUploadMimeType('application/octet-stream', 'archive.zip')).toBe(false);
  });
});
