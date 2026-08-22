import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getRegistrationStatus } from '../../services/auth';

/**
 * The two entry points off the landing page. HR/Admin gets the sign-up affordance (and it
 * is the only path that ever does); employees are told plainly that their account comes
 * from HR, matching the server rule that closes registration once an organisation exists.
 */
export function RoleEntry() {
  const registration = useQuery({
    queryKey: ['registration-status'],
    queryFn: getRegistrationStatus,
    retry: false,
  });
  const signUpOpen = registration.data?.open === true;

  return (
    <section
      id="get-started"
      aria-labelledby="role-entry-heading"
      style={{ padding: '5rem 0', borderTop: '1px solid var(--color-border)' }}
    >
      <div style={{ maxWidth: '1380px', margin: '0 auto', padding: '0 var(--spacing-lg)' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 id="role-entry-heading" style={{ fontSize: 'clamp(1.9rem, 4vw, 2.8rem)', marginBottom: '0.85rem' }}>
            Sign in to DayFlow
          </h2>
          <p
            style={{
              color: 'var(--color-text-muted)',
              fontSize: '1.05rem',
              maxWidth: '34rem',
              margin: '0 auto',
            }}
          >
            Choose how you work with DayFlow. Employee accounts are created by your HR team —
            they'll share your Login ID and a temporary password.
          </p>
        </div>

        <div className="role-entry-grid">
          {/* HR / ADMIN */}
          <article className="role-entry-card">
            <div className="role-entry-icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                <circle cx="9" cy="7" r="3.2" />
                <path d="M17.5 8.5v5M15 11h5" />
              </svg>
            </div>
            <h3 style={{ fontSize: '1.35rem', marginBottom: '0.5rem' }}>Admin / HR</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.98rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
              Manage employees, approve time off, run payroll and audit every change across
              your organisation.
            </p>

            <div className="role-entry-actions">
              <Link to="/login?role=hr" className="landing-btn-primary" style={{ justifyContent: 'center' }}>
                Sign in as HR
              </Link>
              {signUpOpen && (
                <Link to="/signup" className="landing-btn-secondary" style={{ justifyContent: 'center' }}>
                  Create your company
                </Link>
              )}
            </div>

            {!signUpOpen && !registration.isLoading && (
              <p style={{ marginTop: '0.9rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                An organisation already exists for this workspace.
              </p>
            )}
          </article>

          {/* EMPLOYEE */}
          <article className="role-entry-card">
            <div className="role-entry-icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="3.4" />
                <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
              </svg>
            </div>
            <h3 style={{ fontSize: '1.35rem', marginBottom: '0.5rem' }}>Employee</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.98rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
              Check in and out, view your attendance, request time off and keep your profile
              up to date.
            </p>

            <div className="role-entry-actions">
              <Link to="/login?role=employee" className="landing-btn-primary" style={{ justifyContent: 'center' }}>
                Sign in as Employee
              </Link>
            </div>

            <p style={{ marginTop: '0.9rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              No account? Your HR team creates it for you.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
