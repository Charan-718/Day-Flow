
export default function PricingSection() {
  const MODULE_ACCESS = [
    {
      title: 'Employee Self-Service',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-night-bordeaux)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
      badge: 'UNRESTRICTED ACCESS',
      desc: 'All employees receive full access to their personal HR portal upon organization onboarding.',
      highlights: [
        'Daily & Weekly Attendance Check-In / Out',
        'Leave & Time-Off Request Submission (Paid, Sick, Unpaid)',
        'Read-Only Salary Structure & Payroll Visibility (in ₹)',
        'Personal Profile Management (Phone, Address, Avatar)',
        'Real-Time Approval & System Notifications',
      ],
    },
    {
      title: 'HR & Admin Operations',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-night-bordeaux)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <circle cx="12" cy="11" r="3" />
        </svg>
      ),
      badge: 'ADMIN GOVERNANCE',
      desc: 'HR Officers receive comprehensive operational control over all workforce records and workflows.',
      highlights: [
        'Complete Employee Profile & Department Directory',
        'Attendance Records & Anomaly Exception Logs',
        'Multi-Tier Leave Approval & Rejection Workflows',
        'Salary Structure & Compensation Management',
        'Full System Audit Logs & Transaction History',
      ],
    },
    {
      title: 'Enterprise Architecture',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-night-bordeaux)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
          <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
          <line x1="6" y1="6" x2="6.01" y2="6" />
          <line x1="6" y1="18" x2="6.01" y2="18" />
        </svg>
      ),
      badge: 'ODOO ERP STANDARDS',
      desc: 'Built on enterprise database standards for transactional safety and auditability.',
      highlights: [
        'PostgreSQL Database System of Record',
        'Role-Based Access Control (RBAC) & JWT Security',
        'Deterministic Overlap & Anomaly Validation',
        'Workforce Health Operational Score (0-100)',
        'Prisma ORM & Transactional Consistency',
      ],
    },
  ];

  return (
    <section
      id="access"
      style={{
        padding: '6rem var(--spacing-lg)',
        maxWidth: '1280px',
        margin: '0 auto',
      }}
    >
      {/* SECTION HEADER */}
      <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
        <div className="landing-badge-vibrant" style={{ marginBottom: 'var(--spacing-md)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          ALL-INCLUSIVE ENTERPRISE ACCESS
        </div>
        <h2 className="landing-text-lg" style={{ color: 'var(--color-night-bordeaux)', marginBottom: '1.25rem' }}>
          Zero Paywalls. <span className="landing-text-gradient">Full Operational Access</span>
        </h2>
        <p
          style={{
            fontSize: '1.1rem',
            color: 'var(--color-text-secondary)',
            maxWidth: '680px',
            margin: '0 auto',
            fontWeight: 500,
          }}
        >
          Dayflow HRMS provides complete, role-governed module access to all employees and HR officers across your organization.
        </p>
      </div>

      {/* ACCESS CARDS GRID */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2rem',
          alignItems: 'stretch',
        }}
      >
        {MODULE_ACCESS.map((item, idx) => (
          <div key={idx} className="landing-glowing-border-wrap" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div
              className="landing-glowing-border-inner"
              style={{
                height: '100%',
                padding: '2.25rem 2rem',
                background: 'var(--color-surface)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                textAlign: 'left',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  {item.icon}
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-night-bordeaux)', background: 'var(--color-powder-blue)', padding: '0.2rem 0.6rem', borderRadius: '10px', textTransform: 'uppercase' }}>
                    {item.badge}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-night-bordeaux)', marginBottom: '0.65rem' }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: '0.92rem', color: 'var(--color-text-secondary)', marginBottom: '1.75rem', fontWeight: 500, lineHeight: '1.5' }}>
                  {item.desc}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '2rem' }}>
                  {item.highlights.map((feat, fIdx) => (
                    <div key={fIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '0.92rem', color: 'var(--color-text)', fontWeight: 600, lineHeight: '1.4' }}>
                      <span style={{ color: 'var(--color-night-bordeaux)', fontWeight: 900 }}>✓</span>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-background-alt)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: 'var(--color-night-bordeaux)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>RBAC Protected: Included for all users</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
