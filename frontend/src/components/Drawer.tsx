import type { ReactNode } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { CloseIcon } from './icons';

interface DrawerProps {
  open: boolean;
  title?: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** DESIGN_SYSTEM §15.2 review drawers open from the right; §17.2 nav drawers from the left. */
  side?: 'left' | 'right';
  maxWidth?: number;
  /** Falls back to `title` when there's a visible heading; required when there isn't (e.g. a nav menu). */
  ariaLabel?: string;
}

/**
 * Slide-over shell shared by the row-review drawer and the mobile nav drawer. Focus
 * trap, Escape-to-close, backdrop click-to-close, and focus restoration on close
 * (DESIGN_SYSTEM §10/§15.2/§17.2).
 */
export function Drawer({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  side = 'right',
  maxWidth = 480,
  ariaLabel,
}: DrawerProps) {
  const containerRef = useFocusTrap<HTMLDivElement>({ active: open, onClose });

  if (!open) return null;

  return (
    <div className={`fixed inset-0 z-50 flex ${side === 'left' ? 'justify-start' : 'justify-end'}`}>
      <div
        className="absolute inset-0 bg-[rgba(20,32,51,0.48)] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'drawer-title' : undefined}
        aria-label={!title ? ariaLabel : undefined}
        style={{ maxWidth }}
        className="relative flex h-full w-full flex-col bg-white shadow-2xl outline-none"
      >
        {title && (
          <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
            <div className="min-w-0">
              <h2 id="drawer-title" className="break-words text-base font-semibold text-[var(--ink)]">
                {title}
              </h2>
              {subtitle && (
                <p className="mt-0.5 break-words text-sm text-[var(--muted)]">{subtitle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close panel"
              className="shrink-0 rounded-md p-1.5 text-[var(--muted)] hover:bg-[var(--bg)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
            >
              <CloseIcon size={18} />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && <div className="border-t border-[var(--line)] bg-white px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}
