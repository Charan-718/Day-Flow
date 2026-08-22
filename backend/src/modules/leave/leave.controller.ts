import { Request, Response, NextFunction } from 'express';
import * as service from './leave.service';
import { sendSuccess } from '../../utils/responseEnvelope';

export async function types(_req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await service.listLeaveTypes(), 'OK');
  } catch (err) {
    return next(err);
  }
}

export async function balance(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await service.getMyBalances(req.user!), 'OK');
  } catch (err) {
    return next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.createLeaveRequest(req.body, req.user!, req.clientIp);
    return sendSuccess(res, data, 'Leave request submitted successfully', 201);
  } catch (err) {
    return next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.listLeaveRequests(req.query as never, req.user!);
    return sendSuccess(res, data, 'OK');
  } catch (err) {
    return next(err);
  }
}

export async function approve(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.approveLeave(
      req.params.id,
      req.body,
      req.user!,
      req.clientIp
    );
    return sendSuccess(res, data, 'Leave request approved');
  } catch (err) {
    return next(err);
  }
}

export async function reject(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.rejectLeave(
      req.params.id,
      req.body,
      req.user!,
      req.clientIp
    );
    return sendSuccess(res, data, 'Leave request rejected');
  } catch (err) {
    return next(err);
  }
}
