import { api } from '../api/client';
import type { ApiSuccess } from '../types';

/** Reads a File as raw base64 (no data-URL prefix) — used for uploads and HR sign-up. */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(((reader.result as string).split(',')[1]) || '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

/** Mirrors the server rules so users get instant feedback instead of a round-trip 400. */
export function validateImage(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return 'Choose a PNG, JPG, WEBP or GIF image.';
  if (file.size > MAX_IMAGE_BYTES) return 'Image must be 2MB or smaller.';
  return null;
}

export function validateDocument(file: File): string | null {
  const ok = [...IMAGE_TYPES, 'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!ok.includes(file.type)) return 'Choose a PDF, Word document or image.';
  if (file.size > MAX_UPLOAD_BYTES) return 'File must be 5MB or smaller.';
  return null;
}

export async function uploadFile(file: File, opts: { imagesOnly?: boolean } = {}): Promise<string> {
  const dataBase64 = await fileToBase64(file);

  const { data } = await api.post<ApiSuccess<{ url: string }>>('/files', {
    fileName: file.name,
    dataBase64,
    imagesOnly: opts.imagesOnly ?? false,
  });
  return data.data.url;
}
