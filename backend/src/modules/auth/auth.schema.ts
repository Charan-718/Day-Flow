import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email().or(z.string().min(3)),
  password: z.string().min(1),
});

export const createEmployeeSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: z.string().email(),
  role: z.enum(['EMPLOYEE', 'HR_ADMIN']).default('EMPLOYEE'),
  phone: z.string().optional(),
  personalEmail: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  departmentId: z.string().uuid().optional().nullable(),
  designation: z.string().optional(),
  managerId: z.string().uuid().optional().nullable(),
  joiningDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  temporaryPassword: z.string().min(8).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  gender: z.string().optional(),
  maritalStatus: z.string().optional(),
  nationality: z.string().optional(),
  bio: z.string().optional(),
  jobLoveNote: z.string().optional(),
  interests: z.string().optional(),
  skills: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
});

export const verifyEmailSchema = z.object({
  email: z.string().email(),
  loginId: z.string().min(1).optional(),
});
