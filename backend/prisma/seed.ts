import bcrypt from 'bcrypt';
import {
  AccountStatus,
  ComponentBasis,
  LeaveTypeCode,
  PrismaClient,
  Role,
} from '@prisma/client';
import { config } from 'dotenv';
import { generateEmployeeCode, generateLoginId } from '../src/utils/loginIdGenerator';
import { calculateSalaryComponents } from '../src/utils/salaryCalculator';

config();

const prisma = new PrismaClient();

const RUN_DEMO = process.env.SEED_DEMO_DATA === 'true';

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
}

async function upsertDepartments() {
  const eng = await prisma.department.upsert({
    where: { name: 'Engineering' },
    create: { name: 'Engineering', isHrTeam: false },
    update: { isHrTeam: false },
  });
  const hr = await prisma.department.upsert({
    where: { name: 'Human Resources' },
    create: { name: 'Human Resources', isHrTeam: true },
    update: { isHrTeam: true },
  });
  return { eng, hr };
}

async function upsertCompany() {
  const name = process.env.COMPANY_NAME || 'Dayflow';
  const code = (process.env.COMPANY_CODE || 'DF').toUpperCase().slice(0, 4);
  return prisma.company.upsert({
    where: { name },
    create: { name, code },
    update: { code },
  });
}

async function upsertHolidays() {
  const holidays = [
    { name: 'Republic Day', date: new Date('2026-01-26') },
    { name: 'Independence Day', date: new Date('2026-08-15') },
    { name: 'Gandhi Jayanti', date: new Date('2026-10-02') },
  ];
  for (const h of holidays) {
    await prisma.publicHoliday.upsert({
      where: { date: h.date },
      create: h,
      update: { name: h.name },
    });
  }
}

async function ensureBalances(employeeId: string) {
  const types = await prisma.leaveType.findMany();
  const defaults: Record<LeaveTypeCode, number> = { PAID: 24, SICK: 7, UNPAID: 30 };
  for (const lt of types) {
    await prisma.leaveBalance.upsert({
      where: { employeeId_leaveTypeId: { employeeId, leaveTypeId: lt.id } },
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

async function upsertSalary(employeeId: string, monthlyWage: number) {
  const calc = calculateSalaryComponents(monthlyWage);
  const existing = await prisma.salaryStructure.findUnique({ where: { employeeId } });
  if (existing) {
    await prisma.salaryComponent.deleteMany({ where: { salaryStructureId: existing.id } });
    await prisma.salaryStructure.delete({ where: { id: existing.id } });
  }
  await prisma.salaryStructure.create({
    data: {
      employeeId,
      monthlyWage: calc.monthlyWage,
      yearlyWage: calc.yearlyWage,
      workingDaysPerWeek: 5,
      breakTimeMinutes: 60,
      components: {
        create: calc.components.map((c) => ({
          name: c.name,
          basis: c.basis as ComponentBasis,
          percentage: c.percentage,
          amount: c.amount,
        })),
      },
    },
  });
}

async function bootstrapHrAdmin(hrDeptId: string) {
  const email = process.env.BOOTSTRAP_HR_EMAIL;
  const password = process.env.BOOTSTRAP_HR_PASSWORD;
  if (!email || !password) {
    console.log('Bootstrap HR skipped — set BOOTSTRAP_HR_EMAIL and BOOTSTRAP_HR_PASSWORD in .env');
    return null;
  }

  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log('Bootstrap HR skipped — users already exist');
    return null;
  }

  const firstName = process.env.BOOTSTRAP_HR_FIRST_NAME || 'HR';
  const lastName = process.env.BOOTSTRAP_HR_LAST_NAME || 'Administrator';
  const joiningDate = new Date();
  const loginId = await generateLoginId(firstName, lastName, joiningDate);
  const employeeCode = await generateEmployeeCode(joiningDate);
  const passwordHash = await bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS || 12));

  const user = await prisma.user.create({
    data: {
      loginId,
      email: email.toLowerCase(),
      passwordHash,
      role: Role.HR_ADMIN,
      status: AccountStatus.PENDING_ACTIVATION,
      mustChangePassword: true,
    },
  });

  const employee = await prisma.employee.create({
    data: {
      userId: user.id,
      firstName,
      lastName,
      employeeCode,
      departmentId: hrDeptId,
      designation: 'HR Officer',
      joiningDate,
    },
  });

  await ensureBalances(employee.id);
  await upsertSalary(employee.id, 60000);

  console.log('Bootstrap HR admin created:');
  console.log(`  Email: ${email}`);
  console.log(`  Login ID: ${loginId}`);
  console.log('  Change password on first login.');
  return { user, employee };
}

async function seedDemoUsers(engId: string, hrId: string) {
  if (!RUN_DEMO) return;
  console.log('SEED_DEMO_DATA=true — adding sample employees…');

  const demoPassword = process.env.DEMO_SEED_PASSWORD || 'Password@123';
  const passwordHash = await bcrypt.hash(demoPassword, Number(process.env.BCRYPT_ROUNDS || 12));

  const samples = [
    {
      firstName: 'Rahul',
      lastName: 'Verma',
      email: 'rahul@demo.local',
      role: Role.EMPLOYEE,
      departmentId: engId,
      designation: 'Software Engineer',
      wage: 45000,
    },
    {
      firstName: 'Priya',
      lastName: 'Sharma',
      email: 'priya@demo.local',
      role: Role.HR_ADMIN,
      departmentId: hrId,
      designation: 'HR Officer',
      wage: 60000,
    },
  ];

  for (const s of samples) {
    const exists = await prisma.user.findUnique({ where: { email: s.email } });
    if (exists) continue;

    const joiningDate = new Date('2026-02-01');
    const loginId = await generateLoginId(s.firstName, s.lastName, joiningDate);
    const employeeCode = await generateEmployeeCode(joiningDate);

    const user = await prisma.user.create({
      data: {
        loginId,
        email: s.email,
        passwordHash,
        role: s.role,
        status: AccountStatus.ACTIVE,
        mustChangePassword: false,
        emailVerifiedAt: new Date(),
      },
    });

    const employee = await prisma.employee.create({
      data: {
        userId: user.id,
        firstName: s.firstName,
        lastName: s.lastName,
        employeeCode,
        departmentId: s.departmentId,
        designation: s.designation,
        joiningDate,
      },
    });

    await ensureBalances(employee.id);
    await upsertSalary(employee.id, s.wage);
  }
}

async function main() {
  console.log('Dayflow seed — reference data (non-destructive)…');
  await upsertCompany();
  await upsertLeaveTypes();
  const { eng, hr } = await upsertDepartments();
  await upsertHolidays();
  await bootstrapHrAdmin(hr.id);
  await seedDemoUsers(eng.id, hr.id);
  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
