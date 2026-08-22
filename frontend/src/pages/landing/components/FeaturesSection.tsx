import { useState } from 'react';
import workflowImg from '../../../assets/landing/workflow-preview.jpg';

const FEATURES = [
  {
    id: 'onboarding',
    badge: 'EMPLOYEE MANAGEMENT',
    title: 'Centralized Employee Profile & Directory',
    desc: 'Maintain authoritative employee records separating user authentication from HR profiles. Manage department structures, designations, joining dates, and contact details.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    stats: '100% Single Source of Truth',
    details: [
      'Separated User Auth & HR Profile Architecture',
      'Department & Manager Hierarchy Mapping',
      'Employee Self-Service Permitted Field Edits',
    ],
  },
  {
    id: 'attendance',
    badge: 'TIME TRACKING',
    title: 'Daily & Weekly Attendance Tracking',
    desc: 'Provide seamless check-in and check-out workflows with deterministic event history. Automatically calculate working duration, present/absent states, and flag anomalies.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    stats: 'Auditable Event History',
    details: [
      'Daily & Weekly Employee Check-In / Out',
      'Present, Absent, Half-Day & Leave Statuses',
      'Deterministic Missing Checkout & Anomaly Detection',
    ],
  },
  {
    id: 'leave',
    badge: 'APPROVAL WORKFLOWS',
    title: 'Leave & Time-Off Approvals',
    desc: 'Streamline Paid, Sick, and Unpaid leave requests with automated date overlap validation and HR Officer approval comments with real-time status updates.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    stats: 'Zero Overlapping Leaves',
    details: [
      'Date Range Overlap & Balance Validation',
      'Role-Gated HR Approval & Rejection Flow',
      'Real-Time Status Notifications & Audit Trails',
    ],
  },
  {
    id: 'payroll',
    badge: 'PAYROLL VISIBILITY',
    title: 'Salary Structure & Payroll Visibility',
    desc: 'Give employees transparent read-only visibility into their compensation details while enabling HR Admins to manage salary structures and payroll periods securely.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    ),
    stats: 'Strict RBAC Salary Protection',
    details: [
      'Employee Read-Only Payslip & Salary Visibility (in ₹)',
      'HR Admin Compensation & Structure Controls',
      'Backend Authorized Data Security (No URL Leaks)',
    ],
  },
];

export default function FeaturesSection() {
  const [activeTab, setActiveTab] = useState(FEATURES[0].id);
  const activeFeature = FEATURES.find((f) => f.id === activeTab) || FEATURES[0];

  return (
    <section
      id="features"
      style={{
        padding: '6rem var(--spacing-lg)',
        maxWidth: '1280px',
        margin: '0 auto',
      }}
    >
      {/* SECTION HEADER */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-2xl)' }}>
        <div className="landing-badge-vibrant" style={{ marginBottom: 'var(--spacing-md)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          CORE HRMS MODULES
        </div>
        <h2 className="landing-text-lg" style={{ color: 'var(--color-night-bordeaux)', marginBottom: '1.25rem' }}>
          Modular Architecture for <span className="landing-text-gradient">Dayflow HRMS</span>
        </h2>
        <p
          style={{
            fontSize: 'var(--font-size-base)',
            color: 'var(--color-text-secondary)',
            maxWidth: '640px',
            margin: '0 auto',
            fontWeight: 500,
          }}
        >
          Built for the Odoo ERP ecosystem: Digitizing employee onboarding, daily timekeeping, time-off approval workflows, and payroll visibility.
        </p>
      </div>

      {/* FEATURE TAB SELECTORS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.25rem',
          marginBottom: '3.5rem',
        }}
      >
        {FEATURES.map((feat) => {
          const isActive = feat.id === activeTab;
          return (
            <div
              key={feat.id}
              onClick={() => setActiveTab(feat.id)}
              className="landing-vibrant-card"
              style={{
                padding: 'var(--spacing-lg)',
                cursor: 'pointer',
                background: isActive ? 'var(--color-powder-blue-light)' : 'var(--color-surface)',
                borderColor: isActive ? 'var(--color-night-bordeaux)' : 'var(--color-border)',
                boxShadow: isActive ? 'var(--shadow-card)' : 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.75rem', color: 'var(--color-night-bordeaux)' }}>
                {feat.icon}
                <span style={{ fontSize: 'var(--font-size-xs)', color: isActive ? 'var(--color-night-bordeaux)' : 'var(--color-text-muted)', fontWeight: 800, letterSpacing: '0.05em' }}>
                  {feat.badge}
                </span>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-night-bordeaux)', marginBottom: '0.5rem' }}>
                {feat.title}
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
                {feat.desc.substring(0, 85)}...
              </p>
            </div>
          );
        })}
      </div>

      {/* ACTIVE FEATURE PREVIEW BANNER */}
      <div
        className="landing-vibrant-card"
        style={{
          padding: 'var(--spacing-xl)',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '3rem',
          alignItems: 'center',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div>
          <div className="landing-badge-vibrant" style={{ marginBottom: '1.25rem' }}>
            {activeFeature.badge}
          </div>
          <h3 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-night-bordeaux)', marginBottom: 'var(--spacing-md)' }}>
            {activeFeature.title}
          </h3>
          <p style={{ fontSize: '1.05rem', color: 'var(--color-text-secondary)', lineHeight: '1.7', marginBottom: '1.75rem', fontWeight: 500 }}>
            {activeFeature.desc}
          </p>

          {/* KEY BENEFIT BULLETS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: 'var(--spacing-xl)' }}>
            {activeFeature.details.map((detail, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--color-text)', fontSize: '0.95rem', fontWeight: 600 }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--color-success-alpha-15)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                  ✓
                </div>
                {detail}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-night-bordeaux)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              {activeFeature.stats}
            </span>
          </div>
        </div>

        {/* WORKFLOW PREVIEW IMAGE */}
        <div style={{ position: 'relative' }}>
          <div className="landing-glowing-border-wrap">
            <div className="landing-glowing-border-inner" style={{ padding: '0.4rem' }}>
              <img
                src={workflowImg}
                alt="DayFlow Workflow Visualization"
                style={{ width: '100%', borderRadius: 'var(--radius-md)', display: 'block' }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
