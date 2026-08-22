import { Request, Response, NextFunction } from 'express';
import * as service from './payroll.service';
import { sendSuccess } from '../../utils/responseEnvelope';

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getSalary(req.params.id, req.user!);
    return sendSuccess(res, data, 'OK');
  } catch (err) {
    return next(err);
  }
}

export async function upsert(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.upsertSalary(
      req.params.id,
      req.body,
      req.user!,
      req.clientIp
    );
    return sendSuccess(res, data, 'Salary structure updated');
  } catch (err) {
    return next(err);
  }
}
