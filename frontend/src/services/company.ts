import { api } from '../api/client';
import type { ApiSuccess } from '../types';

export async function getCompany() {
  const { data } = await api.get<ApiSuccess<{ name: string; code: string; logoUrl: string | null } | null>>(
    '/company'
  );
  return data.data;
}
