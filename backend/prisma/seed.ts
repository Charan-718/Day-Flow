import bcrypt from 'bcrypt';
import {
  AccountStatus,
  AttendanceEventType,
  AttendanceStatus,
  ComponentBasis,
  LeaveStatus,
  LeaveTypeCode,
  PrismaClient,
  Role,
} from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Password@123';

async function upsertLeaveTypes() {
  const types = [
    { code: LeaveTypeCode.PAID, name: 'Paid Time Off', requiresAttachment: false },
    { code: LeaveTypeCode.SICK, name: 'Sick Leave', requiresAttachment: true },
    { code: LeaveTypeCode.UNPAID, name: 'Unpaid Leave', requiresAttachment: false },
  ];
  for (const t of types) {
    await prisma.leaveType.upsert({
      where: { code: t.code },
      create: t,
      update: { name: t.name, requiresAttachment: t.requiresAttachment },
    });
  }
  return prisma.leaveType.findMany();
}

async function ensureBalances(employeeId: string, leaveTypes: { id: string; code: LeaveTypeCode }[]) {
  const defaults: Record<LeaveTypeCode, number> = {
    PAID: 24,
    SICK: 7,
    UNPAID: 30,
  };
  for (const lt of leaveTypes) {
    await prisma.leaveBalance.upsert({
      where: {
        employeeId_leaveTypeId: { employeeId, leaveTypeId: lt.id },
      },
      create: {
        employeeId,
        leaveTypeId: lt.id,
        allocatedDays: defaults[lt.code],
        usedDays: 0,
      },
      update: {},
    });
  }
}

function indianSalaryComponents(basic: number) {
  return [
    { name: 'Basic Salary', basis: ComponentBasis.FIXED, percentage: null, amount: basic },
    {
      name: 'House Rent Allowance',
      basis: ComponentBasis.PERCENT_OF_BASIC,
      percentage: 40,
      amount: +(basic * 0.4).toFixed(2),
    },
    {
      name: 'Provident Fund (Employee)',
      basis: ComponentBasis.PERCENT_OF_BASIC,
      percentage: 12,
      amount: +(basic * 0.12).toFixed(2),
    },
    {
      name: 'Provident Fund (Employer)',
      basis: ComponentBasis.PERCENT_OF_BASIC,
      percentage: 12,
      amount: +(basic * 0.12).toFixed(2),
    },
    { name: 'Standard Allowance', basis: ComponentBasis.FIXED, percentage: null, amount: 2000 },
    { name: 'Professional Tax', basis: ComponentBasis.FIXED, percentage: null, amount: 200 },
    { name: 'Performance Bonus', basis: ComponentBasis.FIXED, percentage: null, amount: 5000 },
    {
      name: 'Leave Travel Allowance',
      basis: ComponentBasis.PERCENT_OF_BASIC,
      percentage: 8,
      amount: +(basic * 0.08).toFixed(2),
    },
    { name: 'Fixed Allowance', basis: ComponentBasis.FIXED, percentage: null, amount: 1500 },
  ];
}

async function upsertSalary(employeeId: string, basic: number) {
  const existing = await prisma.salaryStructure.findUnique({ where: { employeeId } });
  if (existing) {
    await prisma.salaryComponent.deleteMany({ where: { salaryStructureId: existing.id } });
    await prisma.salaryStructure.delete({ where: { id: existing.id } });
  }
  const components = indianSalaryComponents(basic);
  const monthlyWage = components
    .filter((c) => !c.name.includes('Employer') && c.name !== 'Professional Tax')
    .reduce((s, c) => s + c.amount, 0);

  await prisma.salaryStructure.create({
    data: {
      employeeId,
      monthlyWage,
      yearlyWage: monthlyWage * 12,
      workingDaysPerWeek: 5,
      breakTimeMinutes: 60,
      components: { create: components },
    },
  });
}

async function createPerson(opts: {
  loginId: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  employeeCode: string;
  departmentId: string;
  designation: string;
  joiningDate: Date;
  managerId?: string;
  phone?: string;
  address?: string;
  basic: number;
}) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { email: opts.email },
    create: {
      loginId: opts.loginId,
      email: opts.email,
      passwordHash,
      role: opts.role,
      status: AccountStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
    update: {
      passwordHash,
      role: opts.role,
      status: AccountStatus.ACTIVE,
      loginId: opts.loginId,
    },
  });

  const employee = await prisma.employee.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      firstName: opts.firstName,
      lastName: opts.lastName,
      employeeCode: opts.employeeCode,
      departmentId: opts.departmentId,
      designation: opts.designation,
      joiningDate: opts.joiningDate,
      managerId: opts.managerId,
      phone: opts.phone ?? '+91 98765 43210',
      address: opts.address ?? 'Bengaluru, Karnataka',
      personalEmail: opts.email.replace('@dayflow.local', '@gmail.com'),
      dateOfBirth: new Date('1995-05-15'),
      gender: 'Other',
      maritalStatus: 'Single',
      nationality: 'Indian',
      bankName: 'HDFC Bank',
      bankAccountNumber: '50100' + opts.employeeCode.replace(/\D/g, '').padStart(6, '0'),
      ifscCode: 'HDFC0001234',
      panNumber: 'ABCDE' + opts.employeeCode.replace(/\D/g, '').slice(-4) + 'F',
      uanNumber: '100' + opts.employeeCode.replace(/\D/g, '').padStart(9, '0'),
      bio: `${opts.firstName} works as ${opts.designation}.`,
      jobLoveNote: 'Building great products with great people.',
      interests: 'Reading, Cricket, Coffee',
      skills: ['Communication', 'Problem Solving'],
      certifications: [],
    },
    update: {
      firstName: opts.firstName,
      lastName: opts.lastName,
      departmentId: opts.departmentId,
      designation: opts.designation,
      managerId: opts.managerId,
    },
  });

  return { user, employee };
}

async function seedAttendance(employeeId: string, daysBack: number, missingCheckout = false) {
  for (let i = daysBack; i >= 1; i--) {
    const day = new Date();
    day.setUTCHours(0, 0, 0, 0);
    day.setUTCDate(day.getUTCDate() - i);
    if (day.getUTCDay() === 0 || day.getUTCDay() === 6) continue;

    const checkIn = new Date(day);
    checkIn.setUTCHours(9, 15 + (i % 20), 0, 0);
    const checkOut = new Date(day);
    checkOut.setUTCHours(18, 5, 0, 0);

    const skipCheckout = missingCheckout && i === 2;

    await prisma.attendanceEvent.createMany({
      data: [
        { employeeId, type: AttendanceEventType.CHECK_IN, occurredAt: checkIn },
        ...(!skipCheckout
          ? [{ employeeId, type: AttendanceEventType.CHECK_OUT, occurredAt: checkOut }]
          : []),
      ],
    });

    const workedMinutes = skipCheckout
      ? null
      : Math.round((checkOut.getTime() - checkIn.getTime()) / 60000);

    await prisma.attendanceDaySummary.upsert({
      where: { employeeId_date: { employeeId, date: day } },
      create: {
        employeeId,
        date: day,
        checkIn,
        checkOut: skipCheckout ? null : checkOut,
        workedMinutes,
        status: AttendanceStatus.PRESENT,
        isException: skipCheckout || checkIn.getUTCHours() * 60 + checkIn.getUTCMinutes() > 10 * 60 + 30,
      },
      update: {
        checkIn,
        checkOut: skipCheckout ? null : checkOut,
        workedMinutes,
        isException: skipCheckout,
      },
    });
  }
}

async function main() {
  console.log('Seeding Dayflow…');

  const eng = await prisma.department.upsert({
    where: { name: 'Engineering' },
    create: { name: 'Engineering' },
    update: {},
  });
  const hr = await prisma.department.upsert({
    where: { name: 'Human Resources' },
    create: { name: 'Human Resources' },
    update: {},
  });

  const leaveTypes = await upsertLeaveTypes();

  const priya = await createPerson({
    loginId: 'PS2026001',
    email: 'priya@dayflow.local',
    role: Role.HR_ADMIN,
    firstName: 'Priya',
    lastName: 'Sharma',
    employeeCode: 'EMP2026001',
    departmentId: hr.id,
    designation: 'HR Officer',
    joiningDate: new Date('2026-01-10'),
    phone: '+91 90000 10001',
    basic: 60000,
  });

  const rahul = await createPerson({
    loginId: 'RV2026002',
    email: 'rahul@dayflow.local',
    role: Role.EMPLOYEE,
    firstName: 'Rahul',
    lastName: 'Verma',
    employeeCode: 'EMP2026002',
    departmentId: eng.id,
    designation: 'Software Engineer',
    joiningDate: new Date('2026-02-01'),
    managerId: priya.employee.id,
    phone: '+91 90000 10002',
    basic: 45000,
  });

  const others = [
    {
      loginId: 'AS2026003',
      email: 'aditi@dayflow.local',
      firstName: 'Aditi',
      lastName: 'Singh',
      employeeCode: 'EMP2026003',
      designation: 'Frontend Engineer',
      basic: 42000,
    },
    {
      loginId: 'KP2026004',
      email: 'karan@dayflow.local',
      firstName: 'Karan',
      lastName: 'Patel',
      employeeCode: 'EMP2026004',
      designation: 'Backend Engineer',
      basic: 48000,
    },
    {
      loginId: 'NM2026005',
      email: 'neha@dayflow.local',
      firstName: 'Neha',
      lastName: 'Mehta',
      employeeCode: 'EMP2026005',
      designation: 'QA Engineer',
      basic: 38000,
    },
    {
      loginId: 'AR2026006',
      email: 'arjun@dayflow.local',
      firstName: 'Arjun',
      lastName: 'Rao',
      employeeCode: 'EMP2026006',
      designation: 'DevOps Engineer',
      basic: 50000,
    },
    {
      loginId: 'SK2026007',
      email: 'sara@dayflow.local',
      firstName: 'Sara',
      lastName: 'Khan',
      employeeCode: 'EMP2026007',
      designation: 'Product Designer',
      basic: 40000,
    },
    {
      loginId: 'VD2026008',
      email: 'vikram@dayflow.local',
      firstName: 'Vikram',
      lastName: 'Das',
      employeeCode: 'EMP2026008',
      designation: 'Engineering Manager',
      basic: 75000,
    },
  ];

  const createdOthers = [];
  for (const o of others) {
    const p = await createPerson({
      ...o,
      role: Role.EMPLOYEE,
      departmentId: eng.id,
      joiningDate: new Date('2026-03-15'),
      managerId: priya.employee.id,
    });
    createdOthers.push(p);
  }

  const allEmployees = [priya, rahul, ...createdOthers];

  for (const p of allEmployees) {
    await ensureBalances(p.employee.id, leaveTypes);
    await upsertSalary(
      p.employee.id,
      oBasic(p.employee.employeeCode, others, priya, rahul)
    );
  }

  // Clear and reseed attendance/leave for idempotent demo story
  await prisma.attendanceEvent.deleteMany();
  await prisma.attendanceDaySummary.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();

  await seedAttendance(rahul.employee.id, 12, true);
  for (const p of createdOthers.slice(0, 4)) {
    await seedAttendance(p.employee.id, 8, false);
  }

  const paid = leaveTypes.find((t) => t.code === LeaveTypeCode.PAID)!;
  const sick = leaveTypes.find((t) => t.code === LeaveTypeCode.SICK)!;

  const pending = await prisma.leaveRequest.create({
    data: {
      employeeId: rahul.employee.id,
      leaveTypeId: sick.id,
      startDate: new Date('2026-08-25'),
      endDate: new Date('2026-08-26'),
      daysRequested: 2,
      remarks: 'Fever — doctor advised rest',
      attachmentUrl: 'https://example.com/sick-certificate.pdf',
      status: LeaveStatus.PENDING,
    },
  });

  await prisma.leaveRequest.create({
    data: {
      employeeId: createdOthers[0].employee.id,
      leaveTypeId: paid.id,
      startDate: new Date('2026-07-10'),
      endDate: new Date('2026-07-12'),
      daysRequested: 3,
      status: LeaveStatus.APPROVED,
      reviewedById: priya.user.id,
      reviewComment: 'Approved',
      reviewedAt: new Date('2026-07-08'),
    },
  });

  await prisma.leaveBalance.update({
    where: {
      employeeId_leaveTypeId: {
        employeeId: createdOthers[0].employee.id,
        leaveTypeId: paid.id,
      },
    },
    data: { usedDays: 3 },
  });

  await prisma.leaveRequest.create({
    data: {
      employeeId: createdOthers[1].employee.id,
      leaveTypeId: paid.id,
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-06-02'),
      daysRequested: 2,
      status: LeaveStatus.REJECTED,
      reviewedById: priya.user.id,
      reviewComment: 'Critical release week',
      reviewedAt: new Date('2026-05-28'),
    },
  });

  await prisma.notification.create({
    data: {
      userId: priya.user.id,
      type: 'NEW_LEAVE_REQUEST',
      message: `New Sick Leave request from Rahul Verma pending review`,
    },
  });

  await prisma.auditLog.createMany({
    data: [
      {
        actorId: priya.user.id,
        action: 'EMPLOYEE_CREATED',
        entityType: 'Employee',
        entityId: rahul.employee.id,
        newValue: { loginId: rahul.user.loginId },
      },
      {
        actorId: rahul.user.id,
        action: 'LEAVE_REQUESTED',
        entityType: 'LeaveRequest',
        entityId: pending.id,
        newValue: { type: 'SICK' },
      },
    ],
  });

  console.log('Seed complete.');
  console.log('Demo logins (password for all: Password@123)');
  console.log('  HR Admin : priya@dayflow.local  /  PS2026001');
  console.log('  Employee : rahul@dayflow.local  /  RV2026002');
}

function oBasic(
  code: string,
  others: { employeeCode: string; basic: number }[],
  priya: { employee: { employeeCode: string } },
  rahul: { employee: { employeeCode: string } }
) {
  if (code === priya.employee.employeeCode) return 60000;
  if (code === rahul.employee.employeeCode) return 45000;
  return others.find((o) => o.employeeCode === code)?.basic ?? 40000;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
