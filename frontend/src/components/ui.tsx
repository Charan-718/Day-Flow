import type { ReactNode } from 'react';

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--line)] bg-white px-6 py-12 text-center">
      <p className="text-sm font-medium text-[var(--ink)]">{title}</p>
      {hint && <p className="mt-1 text-sm text-[var(--muted)]">{hint}</p>}
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
          className="mt-3 text-sm font-medium text-[var(--accent)] underline"
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
    <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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
