import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export function saveBase64File(fileName: string, dataBase64: string): string {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const safeName =
    crypto.randomBytes(8).toString('hex') +
    '-' +
    fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  const buffer = Buffer.from(dataBase64, 'base64');
  if (buffer.length > 5 * 1024 * 1024) {
    throw new Error('File exceeds 5MB limit');
  }
  fs.writeFileSync(path.join(UPLOAD_DIR, safeName), buffer);
  return safeName;
}

export function resolveUploadPath(storedName: string): string | null {
  const safe = storedName.replace(/[^a-zA-Z0-9._-]/g, '');
  const full = path.join(UPLOAD_DIR, safe);
  if (!fs.existsSync(full)) return null;
  return full;
}
