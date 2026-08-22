import dashboardImg from '../../../assets/landing/dashboard-preview.jpg';

export default function DemoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--spacing-lg)',
      }}
      onClick={onClose}
    >
      <div
        className="landing-glowing-border-wrap"
        style={{ maxWidth: '850px', width: '100%', boxShadow: 'var(--shadow-lg)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="landing-glowing-border-inner"
          style={{
            padding: 'var(--spacing-xl)',
            background: 'var(--color-surface)',
            position: 'relative',
          }}
        >
          {/* CLOSE BUTTON */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1.25rem',
              right: '1.25rem',
              background: 'rgba(94, 25, 26, 0.08)',
              border: 'none',
              color: 'var(--color-night-bordeaux)',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '1.2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
            }}
          >
            ✕
          </button>

          <div className="landing-badge-vibrant" style={{ marginBottom: 'var(--spacing-md)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
            DAYFLOW HRMS WALKTHROUGH DEMO
          </div>
          <h3 style={{ fontSize: '1.6rem', color: 'var(--color-night-bordeaux)', marginBottom: 'var(--spacing-md)', fontWeight: 800 }}>
            Dayflow HRMS Product Tour & Workflow Demo
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem', fontWeight: 500 }}>
            Experience employee attendance check-in, leave approval workflows, payroll visibility, and workforce health analytics in action.
          </p>

          {/* DEMO VIDEO MOCKUP CONTAINER */}
          <div
            style={{
              position: 'relative',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              border: '1px solid var(--color-border)',
              aspectRatio: '16/9',
            }}
          >
            <img
              src={dashboardImg}
              alt="Demo video preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(30, 41, 59, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 'var(--spacing-md)',
              }}
            >
              <div
                style={{
                  width: '70px',
                  height: '70px',
                  borderRadius: '50%',
                  background: 'var(--color-night-bordeaux)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-lg)',
                  cursor: 'pointer',
                  paddingLeft: '4px',
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="var(--color-text-white)">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
              <span style={{ color: 'var(--color-text-white)', fontWeight: 800, fontSize: 'var(--font-size-base)' }}>
                Click to Play Dayflow HRMS Demo Tour (2:15)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
