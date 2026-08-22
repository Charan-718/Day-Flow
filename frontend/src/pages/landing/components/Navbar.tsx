import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const DEMO_URL = 'https://drive.google.com/drive/folders/1v-TmT90R80MpL3KweY0_ie3kXrwHCmLz?usp=sharing';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: scrolled ? 'var(--color-surface-nav)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--color-border)' : '1px solid transparent',
        transition: 'all 0.35s ease',
        padding: '1.1rem 0',
      }}
    >
      <div
        style={{
          maxWidth: '1380px',
          margin: '0 auto',
          padding: '0 var(--spacing-lg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* BRAND LOGO */}
        <a href="#hero" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-night-bordeaux)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--glow-primary)',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-white)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-night-bordeaux)', letterSpacing: '-0.02em' }}>
            Day<span style={{ color: 'var(--color-secondary)' }}>Flow</span>
          </span>
        </a>

        {/* RIGHT ACTION BUTTONS ONLY */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.1rem' }} aria-label="Sign in">
            <Link
              to="/login?role=hr"
              style={{
                fontSize: '0.92rem',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                textDecoration: 'none',
              }}
            >
              Sign in as HR
            </Link>
            <Link
              to="/login?role=employee"
              style={{
                fontSize: '0.92rem',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                textDecoration: 'none',
              }}
            >
              Sign in as Employee
            </Link>
          </nav>
          <a
            href={DEMO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="landing-btn-secondary"
            style={{ padding: '0.65rem 1.35rem', fontSize: '0.95rem' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Watch Demo
          </a>
          <a
            href="#pricing"
            className="landing-btn-primary"
            style={{ padding: '0.65rem 1.45rem', fontSize: '0.95rem' }}
          >
            Get Started Here
          </a>
        </div>
      </div>
    </header>
  );
}
