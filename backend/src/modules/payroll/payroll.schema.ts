import { z } from 'zod';

export const salaryComponentSchema = z.object({
  name: z.string().min(1),
  basis: z.enum(['FIXED', 'PERCENT_OF_BASIC']),
  percentage: z.number().min(0).max(100).optional().nullable(),
  amount: z.number().min(0),
});

export const upsertSalarySchema = z.object({
  monthlyWage: z.number().positive(),
  yearlyWage: z.number().positive().optional(),
  workingDaysPerWeek: z.number().int().min(1).max(7).default(5),
  breakTimeMinutes: z.number().int().min(0).default(60),
  components: z.array(salaryComponentSchema).min(1),
});
