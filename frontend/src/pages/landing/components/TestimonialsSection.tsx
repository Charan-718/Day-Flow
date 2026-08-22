
const REVIEWS = [
  {
    name: 'Elena Rostova',
    role: 'VP of Human Resources at FinScale',
    initials: 'ER',
    quote: 'Dayflow HRMS eliminated over 20 hours per week of manual leave tracking and attendance reconciliation. The Odoo-compatible PostgreSQL backend performs flawlessly.',
    stars: 5,
  },
  {
    name: 'Marcus Vance',
    role: 'Head of People Ops at CloudPulse',
    initials: 'MV',
    quote: 'The Workforce Health analytics and transparent employee payroll visibility transformed how our leadership team manages attendance anomalies. Exceptional engineering.',
    stars: 5,
  },
  {
    name: 'Sophia Chen',
    role: 'Lead HR Architect at NextLayer',
    initials: 'SC',
    quote: 'Setting up RBAC role permissions and attendance event history took under 5 minutes. Dayflow has become the authoritative system of record for our organization.',
    stars: 5,
  },
];

export default function TestimonialsSection() {
  return (
    <section
      id="testimonials"
      style={{
        padding: '6rem var(--spacing-lg)',
        maxWidth: '1280px',
        margin: '0 auto',
      }}
    >
      {/* SECTION HEADER */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-2xl)' }}>
        <div className="landing-badge-vibrant" style={{ marginBottom: 'var(--spacing-md)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          TRUSTED BY HR LEADERS
        </div>
        <h2 className="landing-text-lg" style={{ color: 'var(--color-night-bordeaux)', marginBottom: '1.25rem' }}>
          Loved by High-Performance <span className="landing-text-gradient">HR Operations Teams</span>
        </h2>
      </div>

      {/* TRUSTED COMPANY LOGOS */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '3rem',
          flexWrap: 'wrap',
          opacity: 0.8,
          marginBottom: '5rem',
        }}
      >
        {['Odoo Ecosystem', 'FinScale HR', 'CloudPulse', 'NextLayer', 'Enterprise HR', 'PostgreSQL Tech'].map((company) => (
          <span key={company} style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--color-night-bordeaux)', letterSpacing: '-0.02em' }}>
            {company}
          </span>
        ))}
      </div>

      {/* REVIEWS GRID */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2rem',
        }}
      >
        {REVIEWS.map((rev, idx) => (
          <div
            key={idx}
            className="landing-vibrant-card"
            style={{
              padding: '2.25rem',
              background: 'var(--color-surface)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div>
              {/* STAR RATING */}
              <div style={{ color: 'var(--color-warning)', marginBottom: 'var(--spacing-md)', fontSize: '1.1rem' }}>
                {'★'.repeat(rev.stars)}
              </div>
              <p style={{ fontSize: '1.05rem', color: 'var(--color-text-secondary)', lineHeight: '1.65', marginBottom: 'var(--spacing-xl)', fontWeight: 500 }}>
                "{rev.quote}"
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'var(--color-night-bordeaux)',
                  color: 'var(--color-text-white)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                }}
              >
                {rev.initials}
              </div>
              <div>
                <div style={{ fontWeight: 800, color: 'var(--color-night-bordeaux)', fontSize: 'var(--font-size-base)' }}>{rev.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>{rev.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
