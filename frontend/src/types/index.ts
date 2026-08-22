export type Role = 'EMPLOYEE' | 'HR_ADMIN';

export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
  code: string;
}

export interface AuthUser {
  id: string;
  loginId: string;
  email: string;
  role: Role;
  employeeId: string | null;
  firstName?: string | null;
  lastName?: string | null;
  mustChangePassword?: boolean;
  employee?: {
    profilePictureUrl?: string | null;
  };

}

export interface EmployeeListItem {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  designation: string | null;
  profilePictureUrl: string | null;
  department: { id: string; name: string } | null;
  employmentStatus: string;
  loginId: string;
  email: string;
  role: Role;
  todayAttendance: {
    status: string | null;
    checkIn: string | null;
    checkOut: string | null;
    isCheckedIn: boolean;
    presence?: 'present' | 'on_leave' | 'absent';
  };
  presence?: 'present' | 'on_leave' | 'absent';
}

export interface LeaveType {
  id: string;
  code: 'PAID' | 'SICK' | 'UNPAID';
  name: string;
  requiresAttachment: boolean;
}

export interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  daysRequested: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  remarks?: string | null;
  attachmentUrl?: string | null;
  reviewComment?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  leaveType: LeaveType;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
  };
  workflow?: {
    steps: Array<{
      key: string;
      label: string;
      at: string | null;
      done: boolean;
      comment?: string | null;
    }>;
  };
}

export interface NotificationItem {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
