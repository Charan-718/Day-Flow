import { z } from 'zod';
import { uploadUrlSchema } from '../../utils/uploadUrl';

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


const strongPassword = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[A-Z]/, 'Must include an uppercase letter')
  .regex(/[a-z]/, 'Must include a lowercase letter')
  .regex(/[0-9]/, 'Must include a number');

/**
 * HR / company registration. This is the ONLY public account-creation path — regular
 * employees are provisioned by an HR Admin via POST /api/auth/employees and can never
 * self-register (enforced in auth.service.register by refusing once a company exists).
 */
export const registerSchema = z
  .object({
    companyName: z.string().min(2, 'Company name is required').max(120),
    // Sent inline (base64) rather than pre-uploaded: /api/files requires auth and no
    // session exists yet during sign-up. Validated + persisted server-side by register().
    companyLogoFileName: z.string().max(200).optional(),
    companyLogoBase64: z.string().max(8_000_000).optional(),
    firstName: z.string().min(1, 'First name is required').max(80),
    lastName: z.string().min(1, 'Last name is required').max(80),
    email: z.string().email('Enter a valid email address'),
    phone: z
      .string()
      .min(7, 'Enter a valid phone number')
      .max(20)
      .regex(/^[0-9+\-\s()]+$/, 'Phone may only contain digits and + - ( )'),
    password: strongPassword,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
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
