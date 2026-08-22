import { z } from 'zod';
import { uploadUrlSchema } from '../../utils/uploadUrl';

export const createLeaveSchema = z.object({
  leaveTypeId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  daysRequested: z.coerce.number().positive().optional(),
  remarks: z.string().max(1000).optional(),
  attachmentUrl: uploadUrlSchema.optional().or(z.literal('')),
});

export const reviewLeaveSchema = z.object({
  comment: z.string().max(1000).optional(),
});

export const rejectLeaveSchema = z.object({
  comment: z.string().min(1, 'Comment is required when rejecting').max(1000),
});

export const listLeaveQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  employeeId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
