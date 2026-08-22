import { z } from 'zod';

export const listEmployeesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

export const updateEmployeeSchema = z
  .object({
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    profilePictureUrl: z.string().url().optional().nullable().or(z.literal('')),
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    personalEmail: z.string().email().optional().nullable().or(z.literal('')),
    departmentId: z.string().uuid().optional().nullable(),
    designation: z.string().optional().nullable(),
    managerId: z.string().uuid().optional().nullable(),
    employmentStatus: z.string().optional(),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    gender: z.string().optional().nullable(),
    maritalStatus: z.string().optional().nullable(),
    nationality: z.string().optional().nullable(),
    bankName: z.string().optional().nullable(),
    bankAccountNumber: z.string().optional().nullable(),
    ifscCode: z.string().optional().nullable(),
    panNumber: z.string().optional().nullable(),
    uanNumber: z.string().optional().nullable(),
    bio: z.string().optional().nullable(),
    jobLoveNote: z.string().optional().nullable(),
    interests: z.string().optional().nullable(),
    skills: z.array(z.string()).optional(),
    certifications: z.array(z.string()).optional(),
  })
  .strict();
