import { z } from 'zod';

/**
 * Uploads are stored app-relative (`/api/files/<32 hex>.<ext>`) so they stay valid across
 * hosts and ports. `z.string().url()` rejects relative paths, so schemas must use this
 * instead — otherwise every profile-picture and attachment upload 400s at the boundary.
 * Absolute http(s) URLs are still accepted for externally hosted assets.
 */
const RELATIVE_UPLOAD = /^\/api\/files\/[a-f0-9]{32}\.[a-z0-9]+$/i;

export const uploadUrlSchema = z
  .string()
  .refine(
    (v) => RELATIVE_UPLOAD.test(v) || /^https?:\/\/\S+$/i.test(v),
    'Must be an uploaded file reference or an http(s) URL'
  );

export function isUploadUrl(value: string): boolean {
  return uploadUrlSchema.safeParse(value).success;
}
