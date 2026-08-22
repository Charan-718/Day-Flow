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
import { config } from 'dotenv';
import { generateEmployeeCode, generateLoginId } from '../src/utils/loginIdGenerator';
import { calculateSalaryComponents } from '../src/utils/salaryCalculator';
import { saveBase64File } from '../src/utils/fileStore';

config();

const prisma = new PrismaClient();

const RUN_DEMO = process.env.SEED_DEMO_DATA === 'true';

// A 1x1-page PDF, just enough to pass the magic-number check in fileStore — used as the
// attachment on seeded sick-leave requests so the Private Info / leave attachment UI has
// something real to open rather than a broken link.
const STUB_PDF_BASE64 = Buffer.from(
  '%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 100]>>endobj\ntrailer<</Size 4/Root 1 0 R>>\n%%EOF'
).toString('base64');

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Best-effort avatar fetch from a public initials-avatar generator — these are generated
 * placeholder graphics (colored initials), never photos of real people, so they're safe to
 * use as synthetic "photos" for seed data. Network failures (e.g. an offline/sandboxed
 * build) are swallowed: the app already renders initials client-side when there's no
 * profilePictureUrl, so a skipped avatar degrades gracefully rather than failing the seed.
 */
async function fetchAvatarBase64(name: string, background?: string): Promise<string | null> {
  try {
    const url = new URL('https://ui-avatars.com/api/');
    url.searchParams.set('name', name);
    url.searchParams.set('size', '256');
    url.searchParams.set('bold', 'true');
    url.searchParams.set('format', 'png');
    url.searchParams.set('color', 'fff');
    url.searchParams.set('background', background || 'random');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;

    const buf = Buffer.from(await res.arrayBuffer());
    return buf.toString('base64');
  } catch {
    return null;
  }
}

async function storeAvatar(name: string, background?: string): Promise<string | null> {
  const base64 = await fetchAvatarBase64(name, background);
  if (!base64) return null;
  try {
    const stored = saveBase64File(`${name.replace(/\s+/g, '-').toLowerCase()}.png`, base64, {
      imagesOnly: true,
    });
    return stored.url;
  } catch {
    return null;
  }
}

async function upsertLeaveTypes() {
  const types = [
    { code: LeaveTypeCode.PAID, name: 'Paid Time Off', requiresAttachment: false },
    { code: LeaveTypeCode.SICK, name: 'Sick Leave', requiresAttachment: true },
    { code: LeaveTypeCode.UNPAID, name: 'Unpaid Leave', requiresAttachment: false },
  ];
  const out: Record<LeaveTypeCode, string> = { PAID: '', SICK: '', UNPAID: '' };
  for (const t of types) {
    const row = await prisma.leaveType.upsert({
      where: { code: t.code },
      create: t,
      update: { name: t.name, requiresAttachment: t.requiresAttachment },
    });
    out[t.code] = row.id;
  }
  return out;
}

const DEPARTMENTS = [
  { name: 'Engineering', isHrTeam: false },
  { name: 'Human Resources', isHrTeam: true },
  { name: 'Sales', isHrTeam: false },
  { name: 'Marketing', isHrTeam: false },
  { name: 'Finance', isHrTeam: false },
  { name: 'Customer Success', isHrTeam: false },
  { name: 'Design', isHrTeam: false },
  { name: 'Operations', isHrTeam: false },
];

async function upsertDepartments() {
  const rows: Record<string, { id: string; isHrTeam: boolean }> = {};
  for (const d of DEPARTMENTS) {
    const row = await prisma.department.upsert({
      where: { name: d.name },
      create: d,
      update: { isHrTeam: d.isHrTeam },
    });
    rows[d.name] = row;
  }
  return rows;
}

/** Reuses whatever company already exists (self-registration only ever allows one) rather
 * than risking a second row — the env values only seed the very first company on an empty
 * database. */
async function upsertCompany() {
  const existing = await prisma.company.findFirst({ orderBy: { createdAt: 'asc' } });
  if (existing) {
    if (!existing.logoUrl) {
      const logoUrl = await storeAvatar(existing.code, '0f766e');
      if (logoUrl) {
        return prisma.company.update({ where: { id: existing.id }, data: { logoUrl } });
      }
    }
    return existing;
  }

  const name = process.env.COMPANY_NAME || 'Odoo India';
  const code = (process.env.COMPANY_CODE || 'OI').toUpperCase().slice(0, 4);
  const logoUrl = await storeAvatar(code, '0f766e');
  return prisma.company.create({ data: { name, code, logoUrl } });
}

const HOLIDAYS_2026 = [
  { name: "New Year's Day", date: '2026-01-01' },
  { name: 'Republic Day', date: '2026-01-26' },
  { name: 'Holi', date: '2026-03-04' },
  { name: 'Good Friday', date: '2026-04-03' },
  { name: 'Independence Day', date: '2026-08-15' },
  { name: 'Ganesh Chaturthi', date: '2026-09-14' },
  { name: 'Gandhi Jayanti', date: '2026-10-02' },
  { name: 'Diwali', date: '2026-11-08' },
  { name: 'Christmas Day', date: '2026-12-25' },
];

async function upsertHolidays() {
  const holidays = HOLIDAYS_2026.map((h) => ({ name: h.name, date: new Date(h.date) }));
  for (const h of holidays) {
    await prisma.publicHoliday.upsert({
      where: { date: h.date },
      create: h,
      update: { name: h.name },
    });
  }
  return holidays.map((h) => h.date.toDateString());
}

async function ensureBalances(employeeId: string, leaveTypeIds: Record<LeaveTypeCode, string>) {
  const defaults: Record<LeaveTypeCode, number> = { PAID: 24, SICK: 7, UNPAID: 30 };
  for (const code of Object.keys(defaults) as LeaveTypeCode[]) {
    await prisma.leaveBalance.upsert({
      where: { employeeId_leaveTypeId: { employeeId, leaveTypeId: leaveTypeIds[code] } },
      create: {
        employeeId,
        leaveTypeId: leaveTypeIds[code],
        allocatedDays: defaults[code],
        usedDays: 0,
      },
      update: {},
    });
  }
}

async function setUsedDays(employeeId: string, leaveTypeId: string, usedDays: number) {
  await prisma.leaveBalance.update({
    where: { employeeId_leaveTypeId: { employeeId, leaveTypeId } },
    data: { usedDays },
  });
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

  const profilePictureUrl = await storeAvatar(`${firstName} ${lastName}`, '5E191A');
  const employee = await prisma.employee.create({
    data: {
      userId: user.id,
      firstName,
      lastName,
      employeeCode,
      profilePictureUrl,
      departmentId: hrDeptId,
      designation: 'HR Officer',
      joiningDate,
    },
  });

  console.log('Bootstrap HR admin created:');
  console.log(`  Email: ${email}`);
  console.log(`  Login ID: ${loginId}`);
  console.log('  Change password on first login.');
  return { user, employee };
}

// ---------------------------------------------------------------------------
// Realistic organisation data
// ---------------------------------------------------------------------------

const FIRST_NAMES_M = [
  'Rahul', 'Amit', 'Vikram', 'Rohan', 'Arjun', 'Karan', 'Siddharth', 'Aditya', 'Nikhil',
  'Varun', 'Manish', 'Rajesh', 'Suresh', 'Aakash', 'Deepak', 'Gaurav', 'Harsh', 'Kunal',
];
const FIRST_NAMES_F = [
  'Priya', 'Sneha', 'Anjali', 'Kavya', 'Neha', 'Divya', 'Pooja', 'Meera', 'Ritu', 'Shreya',
  'Isha', 'Swati', 'Deepika', 'Ananya', 'Tanya', 'Nisha', 'Radhika', 'Aditi',
];
const LAST_NAMES = [
  'Verma', 'Sharma', 'Gupta', 'Reddy', 'Iyer', 'Nair', 'Patel', 'Singh', 'Kumar', 'Mehta',
  'Joshi', 'Rao', 'Choudhary', 'Malhotra', 'Bose', 'Kapoor', 'Desai', 'Menon', 'Pillai', 'Bhat',
];
const CITIES = [
  ['Mumbai', 'Maharashtra'], ['Bengaluru', 'Karnataka'], ['Pune', 'Maharashtra'],
  ['Hyderabad', 'Telangana'], ['Chennai', 'Tamil Nadu'], ['New Delhi', 'Delhi'],
  ['Gurugram', 'Haryana'], ['Noida', 'Uttar Pradesh'], ['Kolkata', 'West Bengal'],
  ['Ahmedabad', 'Gujarat'],
];
const BANKS = ['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra Bank', 'Punjab National Bank'];
const INTERESTS = ['cricket', 'reading', 'trekking', 'photography', 'cooking', 'badminton', 'travel', 'chess', 'music', 'cycling'];

interface RoleSpec {
  designation: string;
  isLead?: boolean;
  wageRange: [number, number];
  skills: string[];
  certifications: string[];
}

const DEPT_ROLES: Record<string, RoleSpec[]> = {
  Engineering: [
    { designation: 'Engineering Manager', isLead: true, wageRange: [140000, 180000], skills: ['System Design', 'Team Leadership', 'Node.js', 'React'], certifications: ['AWS Certified Solutions Architect'] },
    { designation: 'Senior Software Engineer', wageRange: [95000, 130000], skills: ['TypeScript', 'React', 'PostgreSQL', 'System Design'], certifications: [] },
    { designation: 'Software Engineer', wageRange: [55000, 85000], skills: ['JavaScript', 'React', 'Node.js'], certifications: [] },
    { designation: 'Backend Developer', wageRange: [60000, 90000], skills: ['Node.js', 'PostgreSQL', 'REST APIs'], certifications: [] },
    { designation: 'DevOps Engineer', wageRange: [70000, 100000], skills: ['Docker', 'Kubernetes', 'CI/CD', 'AWS'], certifications: ['AWS Certified DevOps Engineer'] },
    { designation: 'QA Engineer', wageRange: [50000, 75000], skills: ['Test Automation', 'Cypress', 'Manual Testing'], certifications: ['ISTQB Certified Tester'] },
  ],
  'Human Resources': [
    { designation: 'HR Manager', isLead: true, wageRange: [110000, 140000], skills: ['Talent Management', 'Employee Relations', 'HR Policy'], certifications: ['SHRM-CP'] },
    { designation: 'HR Business Partner', wageRange: [65000, 90000], skills: ['Employee Relations', 'Performance Management'], certifications: [] },
    { designation: 'Talent Acquisition Specialist', wageRange: [50000, 75000], skills: ['Recruiting', 'Sourcing', 'Interviewing'], certifications: [] },
    { designation: 'HR Officer', wageRange: [45000, 65000], skills: ['Onboarding', 'Payroll Coordination'], certifications: [] },
  ],
  Sales: [
    { designation: 'Sales Manager', isLead: true, wageRange: [100000, 135000], skills: ['Negotiation', 'CRM', 'Team Leadership'], certifications: [] },
    { designation: 'Account Manager', wageRange: [65000, 90000], skills: ['Client Relations', 'CRM', 'Upselling'], certifications: [] },
    { designation: 'Sales Executive', wageRange: [40000, 60000], skills: ['Lead Generation', 'Cold Calling', 'CRM'], certifications: [] },
    { designation: 'Business Development Executive', wageRange: [45000, 65000], skills: ['Market Research', 'Partnerships'], certifications: [] },
  ],
  Marketing: [
    { designation: 'Digital Marketing Manager', isLead: true, wageRange: [95000, 125000], skills: ['SEO', 'Campaign Strategy', 'Analytics'], certifications: ['Google Ads Certified'] },
    { designation: 'Content Strategist', wageRange: [55000, 80000], skills: ['Content Writing', 'SEO', 'Editorial Planning'], certifications: [] },
    { designation: 'SEO Specialist', wageRange: [45000, 70000], skills: ['SEO', 'Google Analytics', 'Keyword Research'], certifications: ['Google Analytics Certified'] },
    { designation: 'Marketing Executive', wageRange: [40000, 60000], skills: ['Social Media', 'Email Marketing'], certifications: [] },
  ],
  Finance: [
    { designation: 'Finance Manager', isLead: true, wageRange: [110000, 145000], skills: ['Financial Planning', 'Budgeting', 'Compliance'], certifications: ['CA'] },
    { designation: 'Finance Analyst', wageRange: [60000, 85000], skills: ['Financial Modelling', 'Excel', 'Reporting'], certifications: [] },
    { designation: 'Accountant', wageRange: [45000, 65000], skills: ['Bookkeeping', 'GST', 'Tally'], certifications: [] },
    { designation: 'Payroll Specialist', wageRange: [45000, 65000], skills: ['Payroll Processing', 'Compliance'], certifications: [] },
  ],
  'Customer Success': [
    { designation: 'Customer Success Manager', isLead: true, wageRange: [85000, 115000], skills: ['Account Management', 'Retention', 'CRM'], certifications: [] },
    { designation: 'Support Engineer', wageRange: [50000, 75000], skills: ['Troubleshooting', 'SQL', 'Customer Support'], certifications: [] },
    { designation: 'Onboarding Specialist', wageRange: [45000, 65000], skills: ['Customer Training', 'Documentation'], certifications: [] },
  ],
  Design: [
    { designation: 'Design Lead', isLead: true, wageRange: [110000, 140000], skills: ['Design Systems', 'Figma', 'Team Leadership'], certifications: [] },
    { designation: 'Product Designer', wageRange: [70000, 100000], skills: ['Figma', 'Prototyping', 'UI Design'], certifications: [] },
    { designation: 'UX Researcher', wageRange: [65000, 90000], skills: ['User Research', 'Usability Testing'], certifications: [] },
  ],
  Operations: [
    { designation: 'Operations Manager', isLead: true, wageRange: [95000, 125000], skills: ['Process Improvement', 'Vendor Management'], certifications: [] },
    { designation: 'Operations Executive', wageRange: [45000, 65000], skills: ['Logistics', 'Coordination'], certifications: [] },
    { designation: 'Office Administrator', wageRange: [35000, 50000], skills: ['Administration', 'Scheduling'], certifications: [] },
  ],
};

function bioFor(firstName: string, designation: string, dept: string) {
  return `${firstName} works as ${/^[aeiou]/i.test(designation) ? 'an' : 'a'} ${designation} in ${dept}, focused on delivering reliable, high-quality work for the team.`;
}

function jobLoveNoteFor(designation: string) {
  const notes = [
    `Solving real problems as a ${designation} and seeing the impact on the team.`,
    'The people — this team makes even the hard weeks enjoyable.',
    'Getting to learn something new every week.',
    'Shipping things that actually make a difference for our users.',
  ];
  return pick(notes);
}

interface SeedPerson {
  firstName: string;
  lastName: string;
  gender: 'Male' | 'Female';
  dept: string;
  role: RoleSpec;
  joiningDate: Date;
  isHr: boolean;
}

async function generatePeople(depts: Record<string, { id: string; isHrTeam: boolean }>, now: Date) {
  const usedNames = new Set<string>();
  const people: SeedPerson[] = [];

  for (const dept of Object.keys(DEPT_ROLES)) {
    const roles = DEPT_ROLES[dept];
    for (const role of roles) {
      let firstName = '';
      let lastName = '';
      let gender: 'Male' | 'Female' = 'Male';
      let key = '';
      do {
        gender = Math.random() < 0.5 ? 'Male' : 'Female';
        firstName = pick(gender === 'Male' ? FIRST_NAMES_M : FIRST_NAMES_F);
        lastName = pick(LAST_NAMES);
        key = `${firstName}${lastName}`;
      } while (usedNames.has(key));
      usedNames.add(key);

      // Leads joined earliest (up to 4 years ago); individual contributors more recently.
      const daysAgo = role.isLead ? randomInt(500, 1500) : randomInt(30, 1100);
      const joiningDate = addDays(now, -daysAgo);

      people.push({
        firstName,
        lastName,
        gender,
        dept,
        role,
        joiningDate,
        isHr: depts[dept].isHrTeam,
      });
    }
  }
  return people;
}

async function createEmployee(
  person: SeedPerson,
  deptId: string,
  managerId: string | null,
  leaveTypeIds: Record<LeaveTypeCode, string>
) {
  const { firstName, lastName, gender, role, joiningDate, isHr } = person;
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@dayflow-demo.local`;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const employee = await prisma.employee.findUnique({ where: { userId: existing.id } });
    return { user: existing, employee: employee!, isNew: false };
  }

  const demoPassword = process.env.DEMO_SEED_PASSWORD || 'Password@123';
  const passwordHash = await bcrypt.hash(demoPassword, Number(process.env.BCRYPT_ROUNDS || 12));
  const loginId = await generateLoginId(firstName, lastName, joiningDate);
  const employeeCode = await generateEmployeeCode(joiningDate);
  const [city, state] = pick(CITIES);

  const user = await prisma.user.create({
    data: {
      loginId,
      email,
      passwordHash,
      role: isHr ? Role.HR_ADMIN : Role.EMPLOYEE,
      status: AccountStatus.ACTIVE,
      mustChangePassword: false,
      emailVerifiedAt: joiningDate,
    },
  });

  const dob = addDays(new Date(), -randomInt(23, 55) * 365);
  const avatarBg = pick(['0f766e', '6d28d9', 'b45309', '0369a1', 'be123c', '15803d']);
  const profilePictureUrl = await storeAvatar(`${firstName} ${lastName}`, avatarBg);

  const employee = await prisma.employee.create({
    data: {
      userId: user.id,
      firstName,
      lastName,
      employeeCode,
      profilePictureUrl,
      phone: `+91 ${randomInt(70000, 99999)}${randomInt(10000, 99999)}`,
      personalEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomInt(1, 99)}@gmail.com`,
      address: `${randomInt(1, 400)}, ${pick(['MG Road', 'Park Street', 'Ring Road', 'Church Street', 'Lake View Road'])}, ${city}, ${state}`,
      departmentId: deptId,
      designation: role.designation,
      managerId,
      joiningDate,
      employmentStatus: 'ACTIVE',
      dateOfBirth: dob,
      gender,
      maritalStatus: pick(['Single', 'Married']),
      nationality: 'Indian',
      bankName: pick(BANKS),
      bankAccountNumber: String(randomInt(100000000000, 999999999999)),
      ifscCode: `${pick(['HDFC', 'ICIC', 'SBIN', 'UTIB', 'KKBK', 'PUNB'])}0${randomInt(100000, 999999)}`,
      panNumber: `${Array.from({ length: 5 }, () => String.fromCharCode(65 + randomInt(0, 25))).join('')}${randomInt(1000, 9999)}${String.fromCharCode(65 + randomInt(0, 25))}`,
      uanNumber: String(randomInt(100000000000, 999999999999)),
      bio: bioFor(firstName, role.designation, person.dept),
      jobLoveNote: jobLoveNoteFor(role.designation),
      interests: pickN(INTERESTS, 3).join(', '),
      skills: role.skills,
      certifications: role.certifications,
    },
  });

  await ensureBalances(employee.id, leaveTypeIds);
  const wage = randomInt(role.wageRange[0], role.wageRange[1]);
  await upsertSalary(employee.id, wage);

  return { user, employee, isNew: true };
}

async function generateAttendance(employeeId: string, joiningDate: Date, now: Date, leaveDates: Set<string>) {
  const windowStart = new Date(Math.max(joiningDate.getTime(), addDays(now, -60).getTime()));
  const events: { type: AttendanceEventType; occurredAt: Date }[] = [];

  for (let d = new Date(windowStart); d <= now; d = addDays(d, 1)) {
    if (isWeekend(d)) continue;
    const key = d.toDateString();
    if (leaveDates.has(key)) {
      await prisma.attendanceDaySummary.upsert({
        where: { employeeId_date: { employeeId, date: d } },
        create: { employeeId, date: new Date(d), status: AttendanceStatus.LEAVE },
        update: { status: AttendanceStatus.LEAVE, checkIn: null, checkOut: null, workedMinutes: null },
      });
      continue;
    }

    const roll = Math.random();
    if (roll < 0.03) {
      // Unplanned absence — no leave request behind it, just an occasional missed day.
      await prisma.attendanceDaySummary.upsert({
        where: { employeeId_date: { employeeId, date: d } },
        create: { employeeId, date: new Date(d), status: AttendanceStatus.ABSENT },
        update: { status: AttendanceStatus.ABSENT, checkIn: null, checkOut: null, workedMinutes: null },
      });
      continue;
    }

    const late = roll > 0.85; // ~15% of days a late arrival
    const checkInHour = late ? randomInt(10, 11) : 9;
    const checkInMinute = late ? randomInt(31, 59) : randomInt(0, 45);
    const checkIn = new Date(d);
    checkIn.setHours(checkInHour, checkInMinute, 0, 0);

    const halfDay = roll > 0.95; // ~5% of days a half day
    const checkOutHour = halfDay ? randomInt(13, 14) : randomInt(18, 19);
    const checkOutMinute = randomInt(0, 59);
    const checkOut = new Date(d);
    checkOut.setHours(checkOutHour, checkOutMinute, 0, 0);

    const rawWorked = Math.round((checkOut.getTime() - checkIn.getTime()) / 60000);
    const workedMinutes = Math.max(0, rawWorked - 60);
    const status = workedMinutes < 240 ? AttendanceStatus.HALF_DAY : AttendanceStatus.PRESENT;

    events.push({ type: AttendanceEventType.CHECK_IN, occurredAt: checkIn });
    events.push({ type: AttendanceEventType.CHECK_OUT, occurredAt: checkOut });

    await prisma.attendanceDaySummary.upsert({
      where: { employeeId_date: { employeeId, date: d } },
      create: {
        employeeId,
        date: new Date(d),
        checkIn,
        checkOut,
        workedMinutes,
        status,
        isException: late,
      },
      update: { checkIn, checkOut, workedMinutes, status, isException: late },
    });
  }

  if (events.length > 0) {
    await prisma.attendanceEvent.createMany({
      data: events.map((e) => ({ employeeId, type: e.type, occurredAt: e.occurredAt })),
    });
  }
}

interface LeaveOutcome {
  leaveDates: Set<string>;
  usedByType: Record<LeaveTypeCode, number>;
}

async function generateLeaveRequests(
  employeeId: string,
  joiningDate: Date,
  now: Date,
  leaveTypeIds: Record<LeaveTypeCode, string>,
  hrAdminUserId: string | null,
  auditActorId: string | null
): Promise<LeaveOutcome> {
  const leaveDates = new Set<string>();
  const usedByType: Record<LeaveTypeCode, number> = { PAID: 0, SICK: 0, UNPAID: 0 };
  const earliestStart = addDays(joiningDate, 14);
  if (earliestStart >= now) return { leaveDates, usedByType };

  function randomPastRange(spanDays: number): [Date, Date] | null {
    const latestStart = addDays(now, -spanDays - 2);
    if (latestStart <= earliestStart) return null;
    let start = addDays(earliestStart, randomInt(0, Math.max(1, Math.floor((latestStart.getTime() - earliestStart.getTime()) / 86400000))));
    while (isWeekend(start)) start = addDays(start, 1);
    const end = addDays(start, spanDays - 1);
    return [start, end];
  }

  const plans: Array<{ code: LeaveTypeCode; spanDays: number; status: LeaveStatus; remarks: string; future?: boolean }> = [
    { code: LeaveTypeCode.PAID, spanDays: randomInt(2, 4), status: LeaveStatus.APPROVED, remarks: pick(['Family function', 'Personal travel', 'Wedding in the family', 'Festival with family']) },
    { code: LeaveTypeCode.SICK, spanDays: randomInt(1, 2), status: LeaveStatus.APPROVED, remarks: pick(['Fever', 'Viral infection', 'Doctor-advised rest']) },
  ];
  if (Math.random() < 0.4) {
    plans.push({ code: LeaveTypeCode.PAID, spanDays: 1, status: LeaveStatus.REJECTED, remarks: 'Personal work' });
  }
  if (Math.random() < 0.5) {
    plans.push({ code: LeaveTypeCode.PAID, spanDays: randomInt(1, 3), status: LeaveStatus.PENDING, remarks: 'Planned trip', future: true });
  }

  for (const plan of plans) {
    let range: [Date, Date] | null;
    if (plan.future) {
      const start = addDays(now, randomInt(5, 25));
      range = [start, addDays(start, plan.spanDays - 1)];
    } else {
      range = randomPastRange(plan.spanDays);
    }
    if (!range) continue;
    const [start, end] = range;
    const daysRequested = plan.spanDays;

    const reviewed = plan.status !== LeaveStatus.PENDING;
    const request = await prisma.leaveRequest.create({
      data: {
        employeeId,
        leaveTypeId: leaveTypeIds[plan.code],
        startDate: start,
        endDate: end,
        daysRequested,
        remarks: plan.remarks,
        status: plan.status,
        reviewedById: reviewed ? hrAdminUserId ?? undefined : undefined,
        reviewComment: plan.status === LeaveStatus.REJECTED ? 'Insufficient notice for this period' : reviewed ? 'Approved' : undefined,
        reviewedAt: reviewed ? addDays(start, -2) : undefined,
      },
    });

    if (plan.code === LeaveTypeCode.SICK) {
      try {
        const stored = saveBase64File('medical-certificate.pdf', STUB_PDF_BASE64);
        await prisma.leaveRequest.update({ where: { id: request.id }, data: { attachmentUrl: stored.url } });
      } catch {
        // Attachment is a nice-to-have for demo realism — request itself already exists.
      }
    }

    if (plan.status === LeaveStatus.APPROVED) {
      usedByType[plan.code] += daysRequested;
      for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
        if (!isWeekend(d)) leaveDates.add(d.toDateString());
      }
    }

    if (reviewed && auditActorId) {
      await prisma.auditLog.create({
        data: {
          actorId: auditActorId,
          action: plan.status === LeaveStatus.APPROVED ? 'APPROVE' : 'REJECT',
          entityType: 'LeaveRequest',
          entityId: request.id,
          previousValue: { status: 'PENDING' },
          newValue: { status: plan.status },
        },
      });
    }
  }

  return { leaveDates, usedByType };
}

async function seedNotifications(userId: string, firstName: string) {
  const messages = [
    `Welcome to Dayflow, ${firstName}! Complete your profile to get started.`,
    'Your leave request was approved.',
    'A new company holiday has been added to the calendar.',
  ];
  for (const message of messages) {
    await prisma.notification.create({
      data: { userId, type: 'INFO', message, isRead: Math.random() < 0.6 },
    });
  }
}

async function seedRealisticOrganisation(
  depts: Record<string, { id: string; isHrTeam: boolean }>,
  leaveTypeIds: Record<LeaveTypeCode, string>
) {
  if (!RUN_DEMO) {
    console.log('SEED_DEMO_DATA is not "true" — skipping realistic demo organisation.');
    return;
  }
  console.log('SEED_DEMO_DATA=true — building a realistic demo organisation…');

  const now = new Date();
  const people = await generatePeople(depts, now);

  // Prefer an existing HR admin (bootstrap or otherwise) as the reviewer/actor on
  // generated leave approvals and audit entries — falls back to the first HR person
  // created in this run once that exists.
  let hrAdminUserId = (await prisma.user.findFirst({ where: { role: Role.HR_ADMIN }, orderBy: { createdAt: 'asc' } }))?.id ?? null;

  const createdByDept: Record<string, { employeeId: string; userId: string; isLead: boolean }[]> = {};
  let created = 0;

  for (const person of people) {
    const dept = depts[person.dept];
    const lead = createdByDept[person.dept]?.find((p) => p.isLead);
    const managerId = person.role.isLead ? null : lead?.employeeId ?? null;

    const { user, employee, isNew } = await createEmployee(person, dept.id, managerId, leaveTypeIds);
    if (!hrAdminUserId && person.isHr) hrAdminUserId = user.id;

    createdByDept[person.dept] = createdByDept[person.dept] || [];
    createdByDept[person.dept].push({ employeeId: employee.id, userId: user.id, isLead: !!person.role.isLead });

    if (!isNew) continue;
    created++;

    const { leaveDates, usedByType } = await generateLeaveRequests(
      employee.id,
      person.joiningDate,
      now,
      leaveTypeIds,
      hrAdminUserId,
      hrAdminUserId
    );
    await generateAttendance(employee.id, person.joiningDate, now, leaveDates);

    for (const code of Object.keys(usedByType) as LeaveTypeCode[]) {
      if (usedByType[code] > 0) {
        await setUsedDays(employee.id, leaveTypeIds[code], usedByType[code]);
      }
    }

    await seedNotifications(user.id, person.firstName);
  }

  console.log(`Realistic organisation: ${people.length} roles across ${Object.keys(DEPT_ROLES).length} departments (${created} newly created).`);
}

async function wipeTransactionalData() {
  console.log('--reset: clearing attendance, leave, notifications and audit log…');
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.attendanceEvent.deleteMany();
  await prisma.attendanceDaySummary.deleteMany();
  await prisma.leaveBalance.updateMany({ data: { usedDays: 0 } });
}

async function main(forceReset: boolean) {
  console.log('Dayflow seed — reference + demo data…');
  if (forceReset) await wipeTransactionalData();

  await upsertCompany();
  const leaveTypeIds = await upsertLeaveTypes();
  const depts = await upsertDepartments();
  await upsertHolidays();
  await bootstrapHrAdmin(depts['Human Resources'].id);
  await seedRealisticOrganisation(depts, leaveTypeIds);
  console.log('Seed complete.');
}

// `npm run db:reset` passes --reset to force-clear and reseed attendance, leave,
// notifications and the audit log even when they already contain data. A routine
// `npm run prisma:seed` (also what runs on every container boot) never does this, and never
// touches company/department/employee/salary rows — those are always additive/idempotent.
const forceReset = process.argv.includes('--reset');

main(forceReset)
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
