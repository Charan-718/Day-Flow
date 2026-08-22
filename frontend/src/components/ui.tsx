import type { ReactNode } from 'react';

export function EmptyState({
  title,
  hint,
  icon,
  action,
}: {
  title: string;
  hint?: string;
  /** DESIGN_SYSTEM §20.1 — an SVG icon, never an emoji. Optional; layout is unaffected if omitted. */
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--line)] bg-white px-6 py-12 text-center">
      {icon && (
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg)] text-[var(--muted)]">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-[var(--ink)]">{title}</p>
      {hint && <p className="mt-1 text-sm text-[var(--muted)]">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-10 animate-pulse rounded-md bg-[var(--line)]/60"
          style={{ opacity: 1 - i * 0.1 }}
        />
      ))}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-4 py-6 text-center">
      <p className="text-sm text-[var(--danger)]">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex h-8 cursor-pointer items-center rounded-md px-3 text-sm font-medium text-[var(--accent)] underline underline-offset-2 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[var(--ink)]">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-[var(--muted)]">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function StatStrip({
  items,
}: {
  items: Array<{ label: string; value: string | number }>;
}) {
  return (
    <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(160px,1fr))]">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-[var(--line)] bg-white px-4 py-3 shadow-[var(--shadow)]"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            {item.label}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--ink)]">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
