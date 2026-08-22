import { useState } from 'react';

export default function RoiCalculator() {
  const [teamSize, setTeamSize] = useState(25);
  const [hourlyRate, setHourlyRate] = useState(550);

  // Calculations: HR & Operational time saved per employee weekly
  const hoursSavedPerMemberWeekly = 4.5;
  const totalWeeklyHoursSaved = Math.round(teamSize * hoursSavedPerMemberWeekly);
  const monthlyHoursSaved = Math.round(totalWeeklyHoursSaved * 4.2);
  const annualRupeeSaved = Math.round(monthlyHoursSaved * 12 * hourlyRate);

  return (
    <section
      id="roi-calculator"
      style={{
        padding: '6rem var(--spacing-lg)',
        maxWidth: '1280px',
        margin: '0 auto',
      }}
    >
      <div
        className="landing-vibrant-card"
        style={{
          padding: 'var(--spacing-2xl) var(--spacing-xl)',
          background: 'linear-gradient(135deg, var(--color-surface) 0%, var(--color-powder-blue-light) 100%)',
          borderColor: 'var(--color-border)',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '3.5rem',
          alignItems: 'center',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {/* SLIDER INPUT CONTROLS */}
        <div>
          <div className="landing-badge-vibrant" style={{ marginBottom: '1.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            HR OPERATIONS SAVINGS CALCULATOR
          </div>
          <h2 style={{ fontSize: '2.2rem', color: 'var(--color-night-bordeaux)', marginBottom: '1.25rem' }}>
            Quantify Your HRMS <span className="landing-text-gradient">Operational Savings</span>
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xl)', fontSize: 'var(--font-size-base)', lineHeight: '1.6', fontWeight: 500 }}>
            Adjust your headcount and average hourly rate to calculate the time and cost savings Dayflow HRMS brings by automating attendance logs, time-off approvals, and payroll queries.
          </p>

          {/* HEADCOUNT SLIDER */}
          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: 'var(--font-size-base)', fontWeight: 700 }}>
              <span style={{ color: 'var(--color-text)' }}>Organization Headcount:</span>
              <span style={{ color: 'var(--color-night-bordeaux)', fontSize: '1.2rem' }}>{teamSize} Employees</span>
            </div>
            <input
              type="range"
              min="5"
              max="250"
              value={teamSize}
              onChange={(e) => setTeamSize(Number(e.target.value))}
              style={{
                width: '100%',
                height: '8px',
                borderRadius: '4px',
                accentColor: 'var(--color-night-bordeaux)',
                cursor: 'pointer',
              }}
            />
          </div>

          {/* HOURLY RATE SLIDER (RUPEE ₹) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: 'var(--font-size-base)', fontWeight: 700 }}>
              <span style={{ color: 'var(--color-text)' }}>Average Hourly Blended Rate:</span>
              <span style={{ color: 'var(--color-night-bordeaux)', fontSize: '1.2rem' }}>₹{hourlyRate} / hr</span>
            </div>
            <input
              type="range"
              min="200"
              max="2000"
              step="50"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(Number(e.target.value))}
              style={{
                width: '100%',
                height: '8px',
                borderRadius: '4px',
                accentColor: 'var(--color-night-bordeaux)',
                cursor: 'pointer',
              }}
            />
          </div>
        </div>

        {/* ROI OUTPUT DISPLAY METRICS */}
        <div
          style={{
            background: 'var(--color-surface)',
            padding: 'var(--spacing-xl)',
            borderRadius: '20px',
            border: '2px solid var(--color-night-bordeaux)',
            textAlign: 'center',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            Estimated Annual HR Operations ROI
          </div>
          <div
            style={{
              fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
              fontWeight: 900,
              fontFamily: 'var(--font-heading)',
              color: 'var(--color-night-bordeaux)',
              marginBottom: '1.5rem',
            }}
          >
            ₹{annualRupeeSaved.toLocaleString()}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1.25rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid var(--color-border)',
            }}
          >
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-night-bordeaux)' }}>
                {monthlyHoursSaved.toLocaleString()} hrs
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>HR Admin Hours Saved / Mo</div>
            </div>
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-success)' }}>
                100%
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Audit Compliance</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
