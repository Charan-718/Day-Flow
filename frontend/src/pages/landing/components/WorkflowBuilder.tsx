import { Fragment, useState } from 'react';

const INITIAL_NODES = [
  {
    id: 1,
    type: 'trigger',
    name: 'Employee Time-Off Application',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-night-bordeaux)" strokeWidth="2.2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    system: 'Dayflow Portal',
    active: true,
  },
  {
    id: 2,
    type: 'validation',
    name: 'Overlap & Balance Engine',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-night-bordeaux)" strokeWidth="2.2">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    system: 'Business Logic',
    active: true,
  },
  {
    id: 3,
    type: 'approval',
    name: 'HR Officer Approval Gate',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-night-bordeaux)" strokeWidth="2.2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
    system: 'RBAC Workflow',
    active: true,
  },
  {
    id: 4,
    type: 'transaction',
    name: 'PostgreSQL Commit & Audit Log',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-night-bordeaux)" strokeWidth="2.2">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
    ),
    system: 'PostgreSQL DB',
    active: true,
  },
];

export default function WorkflowBuilder() {
  const [nodes, setNodes] = useState(INITIAL_NODES);
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);

  const handleToggleNode = (id: number) => {
    setNodes(nodes.map(n => n.id === id ? { ...n, active: !n.active } : n));
  };

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setActiveStep(1);
    
    let step = 1;
    const interval = setInterval(() => {
      step += 1;
      if (step > 4) {
        clearInterval(interval);
        setIsSimulating(false);
        setActiveStep(null);
      } else {
        setActiveStep(step);
      }
    }, 900);
  };

  return (
    <section
      id="workflow"
      style={{
        padding: '6rem var(--spacing-lg)',
        maxWidth: '1280px',
        margin: '0 auto',
      }}
    >
      <div className="landing-vibrant-card" style={{ padding: '3.5rem var(--spacing-xl)', background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div className="landing-badge-vibrant" style={{ marginBottom: 'var(--spacing-md)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            TRANSACTIONAL WORKFLOW SIMULATOR
          </div>
          <h2 className="landing-text-lg" style={{ color: 'var(--color-night-bordeaux)', marginBottom: 'var(--spacing-md)' }}>
            Dayflow HRMS <span className="landing-text-gradient">Approval Pipeline</span>
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', maxWidth: '620px', margin: '0 auto', fontWeight: 500 }}>
            Experience Dayflow's ACID-compliant transactional approval workflow: From employee time-off request to business validation, HR approval, and PostgreSQL audit commit.
          </p>
        </div>

        {/* WORKFLOW PIPELINE CANVAS */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.25rem',
            flexWrap: 'wrap',
            marginBottom: '3rem',
            padding: 'var(--spacing-xl) var(--spacing-md)',
            background: 'var(--color-alabaster-alt)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
          }}
        >
          {nodes.map((node, index) => {
            const isCurrentStep = activeStep === node.id;
            return (
              <Fragment key={node.id}>
                {/* NODE CARD */}
                <div
                  onClick={() => handleToggleNode(node.id)}
                  style={{
                    padding: '1.25rem var(--spacing-lg)',
                    background: node.active ? 'var(--color-surface)' : 'rgba(255,255,255,0.4)',
                    borderRadius: 'var(--radius-md)',
                    border: isCurrentStep
                      ? '2px solid var(--color-night-bordeaux)'
                      : node.active
                      ? '1px solid var(--color-border)'
                      : '1px dashed var(--color-border)',
                    boxShadow: isCurrentStep
                      ? '0 0 25px rgba(94, 25, 26, 0.3)'
                      : node.active
                      ? 'var(--shadow-md)'
                      : 'none',
                    opacity: node.active ? 1 : 0.4,
                    cursor: 'pointer',
                    minWidth: '220px',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                    {node.icon}
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '12px',
                        background: 'rgba(94, 25, 26, 0.1)',
                        color: 'var(--color-night-bordeaux)',
                      }}
                    >
                      {node.type.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-night-bordeaux)', marginBottom: '0.25rem' }}>
                    {node.name}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                    Module: {node.system}
                  </div>

                  {/* LIVE PULSE DOT */}
                  {isCurrentStep && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: 'var(--color-night-bordeaux)',
                        boxShadow: '0 0 15px var(--color-night-bordeaux)',
                      }}
                      className="landing-animate-pulse-slow"
                    />
                  )}
                </div>

                {/* ARROW CONNECTOR */}
                {index < nodes.length - 1 && (
                  <div style={{ color: isCurrentStep ? 'var(--color-night-bordeaux)' : 'var(--color-border)', fontSize: '1.4rem', fontWeight: 800 }}>
                    ➔
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>

        {/* CONTROLS & STATUS */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={handleRunSimulation}
            disabled={isSimulating}
            className="landing-btn-primary"
            style={{
              padding: '0.9rem 2.2rem',
              fontSize: '1.05rem',
              opacity: isSimulating ? 0.7 : 1,
            }}
          >
            {isSimulating ? 'Executing Transaction Live...' : '▶ Run Live Approval Pipeline'}
          </button>
        </div>
      </div>
    </section>
  );
}
