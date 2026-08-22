import { useState } from 'react';

const FAQS = [
  {
    q: 'What is Dayflow HRMS and how does it fit into the Odoo ERP ecosystem?',
    a: 'Dayflow HRMS is a workflow-driven Human Resource Management System built on PostgreSQL, Express, Prisma, and React. It maps directly to Odoo HR concepts (User, Employee, Attendance, Time Off, Payroll, and Audit Chatter) to digitize workforce operations with zero paywall tiers.',
  },
  {
    q: 'How does backend RBAC protect salary data from unauthorized access?',
    a: 'Dayflow enforces Role-Based Access Control (RBAC) at the Express service layer, not just on the frontend. Employees can only query their own salary profile via authenticated JWT sessions. Changing an Employee ID in a API URL returns HTTP 403 Forbidden.',
  },
  {
    q: 'How are attendance check-in, check-out, and anomalies recorded?',
    a: 'Attendance records are logged in PostgreSQL as auditable time events. Business rules validate check-in states to prevent duplicate check-ins, detect missing checkouts, and compute working duration automatically.',
  },
  {
    q: 'How does the system prevent overlapping leave requests?',
    a: 'When an employee submits a leave request, Dayflow executes a PostgreSQL database transaction that validates date ranges against existing requests. Overlapping requests or invalid date spans trigger immediate validation errors.',
  },
  {
    q: 'What is the Workforce Health Dashboard score?',
    a: 'Dayflow calculates a deterministic HR operational health score (0-100) based on transparent business rules: Attendance Consistency (40%), Leave Approval Velocity (20%), Exception Resolution (20%), and Pending HR Actions (20%). Zero AI black boxes.',
  },
];

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFaq = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section
      id="faq"
      style={{
        padding: '6rem var(--spacing-lg)',
        maxWidth: '900px',
        margin: '0 auto',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
        <div className="landing-badge-vibrant" style={{ marginBottom: 'var(--spacing-md)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          FREQUENTLY ASKED QUESTIONS
        </div>
        <h2 className="landing-text-lg" style={{ color: 'var(--color-night-bordeaux)', marginBottom: 'var(--spacing-md)' }}>
          Dayflow HRMS <span className="landing-text-gradient">Architectural FAQ</span>
        </h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {FAQS.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="landing-vibrant-card"
              style={{
                padding: '1.5rem 1.75rem',
                background: 'var(--color-surface)',
                borderColor: isOpen ? 'var(--color-night-bordeaux)' : 'var(--color-border)',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)',
              }}
              onClick={() => toggleFaq(idx)}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 'var(--spacing-md)',
                }}
              >
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-night-bordeaux)' }}>
                  {faq.q}
                </h3>
                <span
                  style={{
                    fontSize: '1.5rem',
                    color: isOpen ? 'var(--color-night-bordeaux)' : 'var(--color-text-muted)',
                    transition: 'transform 0.3s ease',
                    transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                    fontWeight: 800,
                  }}
                >
                  +
                </span>
              </div>

              {isOpen && (
                <p
                  style={{
                    marginTop: 'var(--spacing-md)',
                    fontSize: 'var(--font-size-base)',
                    color: 'var(--color-text-secondary)',
                    lineHeight: '1.65',
                    borderTop: '1px solid var(--color-border-light)',
                    paddingTop: 'var(--spacing-md)',
                    fontWeight: 500,
                  }}
                >
                  {faq.a}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
