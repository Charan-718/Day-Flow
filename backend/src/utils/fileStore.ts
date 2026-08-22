import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { AppError } from './errors';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

/** Extension -> magic-number prefixes we accept. Images are used for avatars/logos; PDF/doc for HR documents. */
const ALLOWED: Record<string, { mime: string; magic?: number[][] }> = {
  '.png': { mime: 'image/png', magic: [[0x89, 0x50, 0x4e, 0x47]] },
  '.jpg': { mime: 'image/jpeg', magic: [[0xff, 0xd8, 0xff]] },
  '.jpeg': { mime: 'image/jpeg', magic: [[0xff, 0xd8, 0xff]] },
  '.webp': { mime: 'image/webp', magic: [[0x52, 0x49, 0x46, 0x46]] },
  '.gif': { mime: 'image/gif', magic: [[0x47, 0x49, 0x46, 0x38]] },
  '.pdf': { mime: 'application/pdf', magic: [[0x25, 0x50, 0x44, 0x46]] },
  '.doc': { mime: 'application/msword' },
  '.docx': {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    magic: [[0x50, 0x4b, 0x03, 0x04]],
  },
};

export const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];

function matchesMagic(buffer: Buffer, magic?: number[][]): boolean {
  // Formats without a reliable signature (legacy .doc) are accepted on extension alone.
  if (!magic || magic.length === 0) return true;
  return magic.some((sig) => sig.every((byte, i) => buffer[i] === byte));
}

export interface SaveFileOptions {
  /** Restrict to image types — used for profile pictures and company logos. */
  imagesOnly?: boolean;
  maxBytes?: number;
}

export interface StoredFile {
  storedName: string;
  /** App-relative URL. Kept relative so it stays valid across hosts/ports. */
  url: string;
  mime: string;
  bytes: number;
}

/**
 * Persists a base64 payload to the uploads dir after validating extension, magic number
 * and size. Filenames get 32 hex chars of entropy — these are capability URLs (see
 * files.routes.ts) so the random component is the access control.
 */
export function saveBase64File(
  fileName: string,
  dataBase64: string,
  opts: SaveFileOptions = {}
): StoredFile {
  const maxBytes = opts.maxBytes ?? MAX_FILE_BYTES;
  const ext = path.extname(fileName || '').toLowerCase();

  const allowedExts = opts.imagesOnly ? IMAGE_EXTENSIONS : Object.keys(ALLOWED);
  if (!ext || !allowedExts.includes(ext)) {
    throw new AppError(
      `Unsupported file type. Allowed: ${allowedExts.join(', ')}`,
      'UNSUPPORTED_FILE_TYPE',
      400
    );
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(dataBase64, 'base64');
  } catch {
    throw new AppError('File payload is not valid base64', 'VALIDATION_ERROR', 400);
  }

  if (buffer.length === 0) {
    throw new AppError('File is empty', 'VALIDATION_ERROR', 400);
  }
  if (buffer.length > maxBytes) {
    throw new AppError(
      `File exceeds the ${Math.round(maxBytes / (1024 * 1024))}MB limit`,
      'FILE_TOO_LARGE',
      400
    );
  }

  const spec = ALLOWED[ext];
  if (!matchesMagic(buffer, spec.magic)) {
    throw new AppError(
      'File contents do not match its extension',
      'UNSUPPORTED_FILE_TYPE',
      400
    );
  }

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const storedName = `${crypto.randomBytes(16).toString('hex')}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, storedName), buffer);

  return {
    storedName,
    url: `/api/files/${storedName}`,
    mime: spec.mime,
    bytes: buffer.length,
  };
}

/** Resolves a stored name to an absolute path, refusing anything that escapes UPLOAD_DIR. */
export function resolveUploadPath(storedName: string): string | null {
  if (!storedName || storedName.includes('/') || storedName.includes('\\')) return null;
  if (!/^[a-f0-9]{32}\.[a-z0-9]+$/i.test(storedName)) return null;

  const full = path.join(UPLOAD_DIR, storedName);
  if (!full.startsWith(UPLOAD_DIR + path.sep)) return null;
  if (!fs.existsSync(full)) return null;
  return full;
}

export function mimeForStoredName(storedName: string): string | undefined {
  return ALLOWED[path.extname(storedName).toLowerCase()]?.mime;
}
