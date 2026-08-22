import type { ReactNode } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { CloseIcon } from './icons';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  /** Optional sticky action row, rendered below a divider (DESIGN_SYSTEM §16). */
  footer?: ReactNode;
}

/**
 * Accessible dialog: focus trap, Escape-to-close, backdrop click-to-close, and focus
 * restoration on close (DESIGN_SYSTEM §16). Full-height sheet on small screens so the
 * footer is always reachable without scrolling past the fold.
 */
export function Modal({ open, title, onClose, children, wide, footer }: ModalProps) {
  const containerRef = useFocusTrap<HTMLDivElement>({ active: open, onClose });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center sm:items-start sm:overflow-y-auto sm:p-4 sm:pt-16">
      <div
        className="absolute inset-0 bg-[rgba(20,32,51,0.48)]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`relative flex h-full w-full flex-col bg-white shadow-2xl outline-none sm:h-auto sm:max-h-[85vh] sm:rounded-lg sm:border sm:border-[var(--line)] ${
          wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'
        }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--line)] px-5 py-3.5">
          <h2 id="modal-title" className="text-base font-semibold text-[var(--ink)]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-[var(--muted)] hover:bg-[var(--bg)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
          >
            <CloseIcon size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-[var(--line)] px-5 py-3.5">{footer}</div>
        )}
      </div>
    </div>
  );
}
