import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email().or(z.string().min(3)),
  password: z.string().min(1),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Must include an uppercase letter')
    .regex(/[a-z]/, 'Must include a lowercase letter')
    .regex(/[0-9]/, 'Must include a number'),
});

export const createEmployeeSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: z.string().email(),
  role: z.enum(['EMPLOYEE', 'HR_ADMIN']).optional(),
  phone: z.string().optional(),
  personalEmail: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  departmentId: z.string().uuid().optional().nullable(),
  designation: z.string().optional(),
  managerId: z.string().uuid().optional().nullable(),
  joiningDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  temporaryPassword: z.string().min(12).optional(),
  monthlyWage: z.coerce.number().positive().optional(),
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
