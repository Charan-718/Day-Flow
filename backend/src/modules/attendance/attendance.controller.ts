import { Request, Response, NextFunction } from 'express';
import * as service from './attendance.service';
import { sendSuccess } from '../../utils/responseEnvelope';

export async function checkIn(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.checkIn(req.user!, req.clientIp);
    return sendSuccess(res, data, 'Checked in successfully');
  } catch (err) {
    return next(err);
  }
}

export async function checkOut(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.checkOut(req.user!, req.clientIp);
    return sendSuccess(res, data, 'Checked out successfully');
  } catch (err) {
    return next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const month = req.query.month ? Number(req.query.month) : undefined;
    const year = req.query.year ? Number(req.query.year) : undefined;
    const data = await service.getMyAttendance(req.user!, month, year);
    return sendSuccess(res, data, 'OK');
  } catch (err) {
    return next(err);
  }
}

export async function adminDay(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getAdminDayView(
      String(req.query.date),
      req.query.search ? String(req.query.search) : undefined
    );
    return sendSuccess(res, data, 'OK');
  } catch (err) {
    return next(err);
  }
}

export async function timeline(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getTimeline(req.params.employeeId, req.user!);
    return sendSuccess(res, data, 'OK');
  } catch (err) {
    return next(err);
  }
}

export async function today(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.employeeId) {
      return sendSuccess(res, { isCheckedIn: false }, 'OK');
    }
    const data = await service.getTodayStatus(req.user.employeeId);
    return sendSuccess(res, data, 'OK');
  } catch (err) {
    return next(err);
  }
}
