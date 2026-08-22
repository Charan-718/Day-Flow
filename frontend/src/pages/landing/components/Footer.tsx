import type React from 'react';
import { useState } from 'react';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <footer
      style={{
        background: 'var(--color-background-deep)',
        borderTop: '1px solid var(--color-border)',
        padding: '5rem var(--spacing-lg) 2rem var(--spacing-lg)',
        marginTop: '6rem',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '3rem',
          marginBottom: 'var(--spacing-2xl)',
        }}
      >
        {/* BRAND COLUMN */}
        <div style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'var(--color-night-bordeaux)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-white)" strokeWidth="2.5">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-night-bordeaux)' }}>
              Dayflow HRMS
            </span>
          </div>

          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', maxWidth: '380px', marginBottom: '1.75rem', fontWeight: 500 }}>
            Single operational HR platform for employee records, timekeeping attendance, time-off approval workflows, and payroll visibility. Built for Odoo ERP Hackathon 2026.
          </p>

          {/* SYSTEM STATUS INDICATOR */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-full)', background: 'rgba(31, 138, 76, 0.1)', border: '1px solid rgba(31, 138, 76, 0.3)', fontSize: 'var(--font-size-xs)', color: 'var(--color-success)', fontWeight: 800 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-success)', boxShadow: '0 0 8px var(--color-success)' }} />
            Odoo Ecosystem Compatible (PostgreSQL System of Record)
          </div>
        </div>

        {/* HR MODULES */}
        <div>
          <h4 style={{ color: 'var(--color-night-bordeaux)', fontSize: 'var(--font-size-base)', fontWeight: 800, marginBottom: '1.25rem' }}>HR Modules</h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {['Employee Profiles', 'Attendance Check-In', 'Leave Approvals', 'Payroll Visibility', 'Audit Trails'].map((link) => (
              <li key={link}>
                <a href="#features" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600, transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-night-bordeaux)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-secondary)'}>
                  {link}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* ARCHITECTURE */}
        <div>
          <h4 style={{ color: 'var(--color-night-bordeaux)', fontSize: 'var(--font-size-base)', fontWeight: 800, marginBottom: '1.25rem' }}>Architecture</h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {['PostgreSQL Database', 'Prisma ORM', 'Express REST API', 'JWT & RBAC Security', 'Workforce Health Score'].map((link) => (
              <li key={link}>
                <a href="#faq" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600, transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-night-bordeaux)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-secondary)'}>
                  {link}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* NEWSLETTER */}
        <div>
          <h4 style={{ color: 'var(--color-night-bordeaux)', fontSize: 'var(--font-size-base)', fontWeight: 800, marginBottom: '1.25rem' }}>Odoo Hackathon 2026</h4>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginBottom: 'var(--spacing-md)', fontWeight: 500 }}>
            Stay updated with Dayflow HRMS releases and enterprise ERP module expansions.
          </p>

          {subscribed ? (
            <div style={{ color: 'var(--color-success)', fontWeight: 800, fontSize: '0.9rem', padding: '0.6rem 0' }}>
              ✓ Thank you for subscribing!
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <input
                type="email"
                required
                placeholder="Enter your work email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  padding: '0.65rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
              <button type="submit" className="landing-btn-primary" style={{ padding: '0.65rem 1rem', fontSize: '0.9rem', justifyContent: 'center' }}>
                Subscribe
              </button>
            </form>
          )}
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          paddingTop: 'var(--spacing-lg)',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--spacing-md)',
          color: 'var(--color-text-muted)',
          fontSize: '0.85rem',
          fontWeight: 500,
        }}
      >
        <div>
          © {new Date().getFullYear()} Dayflow HRMS — Odoo ERP Hackathon 2026. All rights reserved.
        </div>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <a href="#privacy" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>Privacy Policy</a>
          <a href="#terms" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>Terms of Service</a>
          <a href="#security" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>Security</a>
        </div>
      </div>
    </footer>
  );
}
