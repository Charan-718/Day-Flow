
/**
 * Centralized SquareLoader Component
 * Standardized across the entire application for all loading states.
 * Modify this single component to update loading UI site-wide.
 */
export default function SquareLoader({ size = 'medium', label = null, style = {} }: { size?: 'small' | 'medium' | 'large'; label?: string | null; style?: React.CSSProperties }) {
  const sizePx = size === 'small' ? '32px' : size === 'large' ? '56px' : '44px';
  const innerPx = size === 'small' ? '14px' : size === 'large' ? '24px' : '18px';

  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.85rem',
        ...style,
      }}
    >
      {/* ANIMATED SQUARE LOON */}
      <div
        style={{
          position: 'relative',
          width: sizePx,
          height: sizePx,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* ROTATING OUTER SQUARE BORDER */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '10px',
            border: '3px solid var(--color-powder-blue)',
            borderTopColor: 'var(--color-night-bordeaux)',
            borderRightColor: 'var(--color-night-bordeaux)',
            animation: 'squareSpin 1.2s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite',
            boxShadow: 'var(--glow-primary)',
          }}
        />

        {/* PULSATING INNER SQUARE CORE */}
        <div
          style={{
            width: innerPx,
            height: innerPx,
            borderRadius: '4px',
            background: 'var(--color-night-bordeaux)',
            animation: 'squarePulse 1.2s ease-in-out infinite alternate',
          }}
        />
      </div>

      {/* OPTIONAL LABEL */}
      {label && (
        <span
          style={{
            fontSize: '0.85rem',
            fontWeight: 700,
            color: 'var(--color-night-bordeaux)',
            letterSpacing: '0.04em',
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
