import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../middleware/requireAuth';
import { saveBase64File, resolveUploadPath } from '../../utils/fileStore';
import { sendSuccess } from '../../utils/responseEnvelope';
import { AppError } from '../../utils/errors';

const router = Router();

router.use(requireAuth);

router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileName, dataBase64 } = req.body as { fileName?: string; dataBase64?: string };
    if (!fileName || !dataBase64) {
      throw new AppError('fileName and dataBase64 are required', 'VALIDATION_ERROR', 400);
    }
    const stored = saveBase64File(fileName, dataBase64);
    return sendSuccess(res, { url: `/api/files/${stored}` }, 'File uploaded', 201);
  } catch (err) {
    return next(err);
  }
});

router.get('/:name', (req: Request, res: Response, next: NextFunction) => {
  try {
    const full = resolveUploadPath(req.params.name);
    if (!full) throw new AppError('File not found', 'NOT_FOUND', 404);
    return res.sendFile(full);
  } catch (err) {
    return next(err);
  }
});

export default router;
