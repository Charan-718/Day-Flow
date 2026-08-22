import { api } from '../api/client';

export async function checkIn() {
  const { data } = await api.post('/attendance/check-in');
  return data.data;
}

export async function checkOut() {
  const { data } = await api.post('/attendance/check-out');
  return data.data;
}

export async function getToday() {
  const { data } = await api.get('/attendance/today');
  return data.data as {
    isCheckedIn: boolean;
    checkIn: string | null;
    checkOut: string | null;
    status: string | null;
  };
}

export async function getMyAttendance(month?: number, year?: number) {
  const { data } = await api.get('/attendance/me', { params: { month, year } });
  return data.data;
}

export async function getAdminAttendance(date: string, search?: string) {
  const { data } = await api.get('/attendance', { params: { date, search } });
  return data.data;
}

export async function getTimeline(employeeId: string) {
  const { data } = await api.get(`/attendance/${employeeId}/timeline`);
  return data.data;
}
