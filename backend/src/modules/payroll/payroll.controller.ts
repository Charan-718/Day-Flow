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

export async function payslipPreview(req: Request, res: Response, next: NextFunction) {
  try {
    const month = req.query.month ? Number(req.query.month) : undefined;
    const year = req.query.year ? Number(req.query.year) : undefined;
    const data = await service.getPayslipPreview(req.params.id, req.user!, month, year);
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

export async function upsertFromWage(req: Request, res: Response, next: NextFunction) {
  try {
    const { monthlyWage, workingDaysPerWeek = 5, breakTimeMinutes = 60 } = req.body as {
      monthlyWage: number;
      workingDaysPerWeek?: number;
      breakTimeMinutes?: number;
    };
    const data = await service.upsertSalaryFromWage(
      req.params.id,
      monthlyWage,
      workingDaysPerWeek,
      breakTimeMinutes,
      req.user!,
      req.clientIp
    );
    return sendSuccess(res, data, 'Salary structure updated from wage');
  } catch (err) {
    return next(err);
  }
}
