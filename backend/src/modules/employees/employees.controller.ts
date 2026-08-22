import { Request, Response, NextFunction } from 'express';
import * as service from './employees.service';
import { sendSuccess } from '../../utils/responseEnvelope';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.listEmployees(req.query as never);
    return sendSuccess(res, data, 'OK');
  } catch (err) {
    return next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getEmployeeById(req.params.id, req.user!);
    return sendSuccess(res, data, 'OK');
  } catch (err) {
    return next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.updateEmployee(
      req.params.id,
      req.body,
      req.user!,
      req.clientIp
    );
    return sendSuccess(res, data, 'Employee updated');
  } catch (err) {
    return next(err);
  }
}

export async function get360(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getEmployee360(req.params.id);
    return sendSuccess(res, data, 'OK');
  } catch (err) {
    return next(err);
  }
}

export async function departments(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.listDepartments();
    return sendSuccess(res, data, 'OK');
  } catch (err) {
    return next(err);
  }
}
