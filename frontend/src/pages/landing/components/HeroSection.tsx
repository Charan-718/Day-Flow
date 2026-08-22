import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import SquareLoader from './SquareLoader';

const DEMO_URL = 'https://drive.google.com/drive/folders/1v-TmT90R80MpL3KweY0_ie3kXrwHCmLz?usp=sharing';

export default function HeroSection() {
  const [autoRotate, setAutoRotate] = useState(true);
  const [activeRole, setActiveRole] = useState('admin');
  const [cameraTheta, setCameraTheta] = useState(0);
  // <model-viewer> is a custom element; its imperative API isn't in lib.dom.
  const modelViewerRef = useRef<(HTMLElement & { getCameraOrbit?: () => { theta: number } }) | null>(null);

  useEffect(() => {
    const modelViewer = modelViewerRef.current;
    if (!modelViewer) return;

    const handleCameraChange = () => {
      try {
        const orbit = modelViewer.getCameraOrbit?.();
        if (orbit && typeof orbit.theta === 'number') {
          setCameraTheta(orbit.theta);
        }
      } catch {
        // getCameraOrbit() is unavailable until the custom element finishes upgrading.
      }
    };

    modelViewer.addEventListener('camera-change', handleCameraChange);
    return () => {
      modelViewer.removeEventListener('camera-change', handleCameraChange);
    };
  }, []);

  // Calculate 3D spatial tilt and horizontal shift tracking 3D model rotation
  const tiltY = Math.sin(cameraTheta) * 18;
  const shiftX = Math.sin(cameraTheta) * 22;

  return (
    <section
      id="hero"
      style={{
        position: 'relative',
        padding: '1rem var(--spacing-lg) 2rem var(--spacing-lg)',
        maxWidth: '1380px',
        margin: '0 auto',
      }}
    >
      {/* SEAMLESS HERO POSTER CANVAS */}
      <div className="landing-glowing-border-wrap" style={{ boxShadow: 'var(--shadow-lg)' }}>
        <div
          className="landing-glowing-border-inner"
          style={{
            position: 'relative',
            background: 'var(--color-alabaster-canvas)',
            borderRadius: 'calc(var(--radius-lg) - 1px)',
            overflow: 'hidden',
            minHeight: '660px',
            maxHeight: 'calc(100vh - 100px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '1.25rem 1.5rem 1rem 1.5rem',
            textAlign: 'center',
          }}
        >
          {/* TOP BORDER ATTACHED SQUARE TAB ON MAIN CONTAINER BORDER */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            title={autoRotate ? 'Pause 3D Rotation' : 'Start 3D Rotation'}
            style={{
              position: 'absolute',
              top: '0',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 25,
              cursor: 'pointer',
              width: '38px',
              height: '38px',
              borderRadius: '0 0 8px 8px',
              background: 'var(--color-night-bordeaux)',
              color: 'var(--color-text-white)',
              border: '2px solid var(--color-night-bordeaux)',
              borderTop: 'none',
              boxShadow: 'var(--shadow-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              fontWeight: 800,
              transition: 'all 0.3s ease',
            }}
          >
            {autoRotate ? '⏸' : '▶'}
          </button>

          {/* ==========================================================================
             1. BACKGROUND STACKED KINETIC WATERMARK TYPOGRAPHY ("DAY-FLOW")
             ========================================================================== */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'center',
              overflow: 'hidden',
              pointerEvents: 'none',
              userSelect: 'none',
              zIndex: 1,
              opacity: 0.85,
            }}
          >
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'clamp(5rem, 12vw, 10rem)',
                  fontWeight: 900,
                  lineHeight: '0.82',
                  letterSpacing: '-0.04em',
                  whiteSpace: 'nowrap',
                  textTransform: 'uppercase',
                  color: i % 2 === 0 ? 'transparent' : 'var(--color-night-bordeaux)',
                  WebkitTextStroke: i % 2 === 0 ? '2px var(--color-powder-blue)' : 'none',
                  opacity: i % 2 === 0 ? 0.35 : 0.08,
                  transform: i % 2 === 0 ? 'translateX(-6%)' : 'translateX(6%)',
                }}
              >
                DAY-FLOW DAY-FLOW DAY-FLOW
              </div>
            ))}
          </div>

          {/* ==========================================================================
             2. FOREGROUND 3D MODEL VIEWER CONTAINER WITH DYNAMIC TRACKING CARDS
             ========================================================================== */}
          <div
            style={{
              position: 'relative',
              zIndex: 5,
              width: '100%',
              height: '370px',
              margin: '0.25rem 0',
              perspective: '1000px',
            }}
          >
            {/* TOP-LEFT CONNECTED CARD BUTTON: ADMIN (3D PARALLEL ROTATION) */}
            <Link
              to="/login?role=hr"
              onMouseEnter={() => setActiveRole('admin')}
              className="landing-vibrant-card"
              style={{
                position: 'absolute',
                top: '0.5rem',
                left: '10%',
                zIndex: 10,
                cursor: 'pointer',
                padding: '0.65rem 1.25rem',
                background: 'var(--color-night-bordeaux)',
                color: 'var(--color-text-white)',
                borderRadius: 'var(--radius-md)',
                border: activeRole === 'admin' ? '2px solid var(--color-powder-blue)' : '2px solid var(--color-night-bordeaux)',
                boxShadow: activeRole === 'admin' ? 'var(--glow-cyan)' : 'var(--shadow-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.55rem',
                fontWeight: 800,
                fontSize: '0.88rem',
                transform: `perspective(600px) rotateY(${tiltY}deg) translateX(${shiftX}px) ${activeRole === 'admin' ? 'scale(1.04)' : 'scale(1)'}`,
                transition: 'all 0.3s ease',
                transformStyle: 'preserve-3d',
                textDecoration: 'none',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <circle cx="12" cy="11" r="3" />
              </svg>
              <span>Admin / HR Officer</span>
            </Link>

            {/* LEFT CONNECTING LINE POINTER (ADMIN CARD -> MONITOR SCREEN) */}
            <svg
              style={{
                position: 'absolute',
                top: '1.6rem',
                left: 'calc(7% + 108px)',
                width: '240px',
                height: '180px',
                zIndex: 9,
                pointerEvents: 'none',
                transform: `perspective(600px) rotateY(${tiltY * 0.7}deg) translateX(${shiftX * 0.7}px)`,
                transition: 'transform 0.05s linear',
              }}
            >
              <path
                d="M 10 0 L 10 70 L 210 150"
                fill="none"
                stroke="var(--color-night-bordeaux)"
                strokeWidth="2.5"
                strokeDasharray="5 4"
              />
              <circle cx="210" cy="150" r="5" fill="var(--color-night-bordeaux)" />
              <circle cx="210" cy="150" r="9" fill="none" stroke="var(--color-powder-blue)" strokeWidth="2" />
            </svg>

            {/* TOP-RIGHT CONNECTED CARD BUTTON: EMPLOYEE (3D PARALLEL ROTATION) */}
            <Link
              to="/login?role=employee"
              onMouseEnter={() => setActiveRole('employee')}
              className="landing-vibrant-card"
              style={{
                position: 'absolute',
                top: '0.5rem',
                right: '24%',
                zIndex: 10,
                cursor: 'pointer',
                padding: '0.65rem 1.25rem',
                background: 'var(--color-night-bordeaux)',
                color: 'var(--color-text-white)',
                borderRadius: 'var(--radius-md)',
                border: activeRole === 'employee' ? '2px solid var(--color-powder-blue)' : '2px solid var(--color-night-bordeaux)',
                boxShadow: activeRole === 'employee' ? 'var(--glow-cyan)' : 'var(--shadow-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.55rem',
                fontWeight: 800,
                fontSize: '0.88rem',
                transform: `perspective(600px) rotateY(${tiltY}deg) translateX(${shiftX}px) ${activeRole === 'employee' ? 'scale(1.04)' : 'scale(1)'}`,
                transition: 'all 0.3s ease',
                transformStyle: 'preserve-3d',
                textDecoration: 'none',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>Employee Portal</span>
            </Link>

            {/* RIGHT CONNECTING LINE POINTER (EMPLOYEE CARD -> PC TOWER) */}
            <svg
              style={{
                position: 'absolute',
                top: '1.6rem',
                right: 'calc(24% + 75px)',
                width: '200px',
                height: '180px',
                zIndex: 9,
                pointerEvents: 'none',
                transform: `perspective(600px) rotateY(${tiltY * 0.7}deg) translateX(${shiftX * 0.7}px)`,
                transition: 'transform 0.05s linear',
              }}
            >
              <path
                d="M 180 0 L 180 60 L 45 145"
                fill="none"
                stroke="var(--color-night-bordeaux)"
                strokeWidth="2.5"
                strokeDasharray="5 4"
              />
              <circle cx="45" cy="145" r="5" fill="var(--color-night-bordeaux)" />
              <circle cx="45" cy="145" r="9" fill="none" stroke="var(--color-powder-blue)" strokeWidth="2" />
            </svg>

            {/* 3D GLB MODEL VIEWER WITH LOCKED MIN-CAMERA-ORBIT FOR PERSISTENT REFRESH ZOOM */}
            <model-viewer
              ref={modelViewerRef}
              src="/programmer_desktop_3d_pc.glb"
              alt="Interactive 3D Programmer Desktop PC"
              auto-rotate={autoRotate ? true : undefined}
              camera-controls
              touch-action="pan-y"
              shadow-intensity="1.8"
              shadow-softness="0.8"
              exposure="1.15"
              camera-orbit="0deg 75deg 18.85m"
              min-camera-orbit="auto auto 18.85m"
              max-camera-orbit="auto auto 30m"
              scale="0.8 0.8 0.8"
              field-of-view="55deg"
              style={{
                width: '100%',
                height: '100%',
                display: 'block',
                background: 'transparent',
              }}
            >
              <div
                slot="poster"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.4)',
                }}
              >
                <SquareLoader size="large" label="Initializing Dayflow HRMS 3D Workspace..." />
              </div>
            </model-viewer>
          </div>

          {/* ==========================================================================
             3. GOLDEN RATIO TYPOGRAPHY HEADLINE, CRISP SUBTITLE & CTA BUTTONS
             ========================================================================== */}
          <div style={{ position: 'relative', zIndex: 10, maxWidth: '850px', margin: '0.25rem auto 0.75rem auto' }}>
            <h1
              className="landing-text-display"
              style={{
                fontSize: 'clamp(1.75rem, 3.2vw, 2.7rem)',
                fontWeight: 900,
                color: 'var(--color-night-bordeaux)',
                marginBottom: '0.5rem',
                lineHeight: '1.15',
                letterSpacing: '-0.02em',
              }}
            >
              Streamline HR & Attendance with{' '}
              <span className="landing-text-gradient">
                {activeRole === 'admin' ? 'Dayflow HRMS Governance' : 'Dayflow Employee Self-Service'}
              </span>
            </h1>

            <p
              style={{
                fontSize: '0.95rem',
                maxWidth: '680px',
                margin: '0 auto 1.1rem auto',
                color: 'var(--color-text-secondary)',
                lineHeight: '1.5',
                fontWeight: 600,
              }}
            >
              {activeRole === 'admin'
                ? 'Manage employee records, daily attendance logs, leave approvals, and payroll visibility in one platform.'
                : 'Quick daily check-in, instant leave requests, transparent payslip access, and real-time approval updates.'}
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
                flexWrap: 'wrap',
              }}
            >
              <a href="#access" className="landing-btn-primary" style={{ padding: '0.65rem 1.4rem', fontSize: '0.9rem' }}>
                Launch Dayflow HRMS Workspace
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </a>

              <a
                href={DEMO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="landing-btn-secondary"
                style={{ padding: '0.65rem 1.4rem', fontSize: '0.9rem' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Watch Product Tour
              </a>
            </div>
          </div>

          {/* ==========================================================================
             4. BOTTOM CONTROL BAR WITH VECTOR ICONS (NO EMOJIS)
             ========================================================================== */}
          <div
            style={{
              position: 'relative',
              zIndex: 10,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              padding: '0.65rem 1rem',
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(12px)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-night-bordeaux)', boxShadow: '0 0 8px var(--color-night-bordeaux)' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-night-bordeaux)' }}>
                DAYFLOW HRMS ({activeRole.toUpperCase()} MODE)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="6" y="3" width="12" height="18" rx="6" />
                  <line x1="12" y1="7" x2="12" y2="11" />
                </svg>
                Drag to Rotate
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="11" y1="8" x2="11" y2="14" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
                Scroll to Zoom
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="5" y="2" width="14" height="20" rx="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
                Touch to Pan
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
