import { api } from '../api/client';
import type { ApiSuccess } from '../types';

export async function updateSalaryFromWage(
  employeeId: string,
  body: {
    monthlyWage: number;
    workingDaysPerWeek?: number;
    breakTimeMinutes?: number;
  }
) {
  const { data } = await api.put(`/employees/${employeeId}/salary/from-wage`, body);
  return data.data;
}

export async function getPayslipPreview(employeeId: string, month?: number, year?: number) {
  const { data } = await api.get<ApiSuccess<Record<string, unknown>>>(
    `/employees/${employeeId}/payslip-preview`,
    { params: { month, year } }
  );
  return data.data;
}
