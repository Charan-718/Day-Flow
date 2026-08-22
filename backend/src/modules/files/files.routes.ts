import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../middleware/requireAuth';
import { saveBase64File, resolveUploadPath, mimeForStoredName } from '../../utils/fileStore';
import { sendSuccess } from '../../utils/responseEnvelope';
import { AppError } from '../../utils/errors';

const router = Router();

/**
 * Uploading always requires authentication.
 *
 * Reading does NOT: stored names carry 128 bits of entropy and act as capability URLs.
 * This is required because <img src> cannot send an Authorization header, and the company
 * logo has to render on the login/sign-up screens before any session exists. Filenames are
 * never enumerable and are only handed to users already authorised to see the record.
 */
router.post('/', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileName, dataBase64, imagesOnly } = req.body as {
      fileName?: string;
      dataBase64?: string;
      imagesOnly?: boolean;
    };
    if (!fileName || !dataBase64) {
      throw new AppError('fileName and dataBase64 are required', 'VALIDATION_ERROR', 400);
    }
    const stored = saveBase64File(fileName, dataBase64, { imagesOnly: Boolean(imagesOnly) });
    return sendSuccess(
      res,
      { url: stored.url, mime: stored.mime, bytes: stored.bytes },
      'File uploaded',
      201
    );
  } catch (err) {
    return next(err);
  }
});

router.get('/:name', (req: Request, res: Response, next: NextFunction) => {
  try {
    const full = resolveUploadPath(req.params.name);
    if (!full) throw new AppError('File not found', 'NOT_FOUND', 404);

    const mime = mimeForStoredName(req.params.name);
    if (mime) res.type(mime);
    // Immutable: stored names are content-addressed by random id and never reused.
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    return res.sendFile(full);
  } catch (err) {
    return next(err);
  }
});

export default router;
