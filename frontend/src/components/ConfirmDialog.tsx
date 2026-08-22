import { useRef } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { WarningIcon } from './icons';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Blocking confirmation for an irreversible action (DESIGN_SYSTEM §18.2). Focus defaults
 * to Cancel — the safe choice — never to the destructive action.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const containerRef = useFocusTrap<HTMLDivElement>({
    active: open,
    onClose: onCancel,
    initialFocusRef: cancelRef,
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[rgba(20,32,51,0.48)]" onClick={onCancel} aria-hidden="true" />
      <div
        ref={containerRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
        className="relative w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-[var(--color-text)] shadow-2xl outline-none"
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              variant === 'danger'
                ? 'bg-[var(--danger-soft)] text-[var(--danger)]'
                : 'bg-[var(--accent-soft)] text-[var(--accent)]'
            }`}
          >
            <WarningIcon size={18} />
          </span>
          <div className="min-w-0">
            <h2 id="confirm-title" className="text-base font-semibold text-[var(--ink)]">
              {title}
            </h2>
            <p id="confirm-desc" className="mt-1 break-words text-sm text-[var(--muted)]">
              {description}
            </p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button ref={cancelRef} type="button" variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
