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
    <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-12 text-center shadow-lg">
      {icon && (
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-background-deep)] text-[var(--color-powder-blue)]">
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold text-[var(--color-text)]">{title}</p>
      {hint && <p className="mt-1 text-sm text-[var(--color-text-muted)]">{hint}</p>}
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
    <div className="rounded-xl border border-[var(--color-bordeaux-main)]/40 bg-[var(--color-bordeaux-alpha-15)] px-4 py-6 text-center">
      <p className="text-sm font-medium text-[#ff7b79]">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex h-8 cursor-pointer items-center rounded-md px-3 text-sm font-semibold text-[var(--color-powder-blue)] underline underline-offset-2 hover:text-white focus-visible:outline-none"
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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--color-border)]/60 pb-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--color-heading)]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm font-medium text-[var(--color-text-muted)]">{subtitle}</p>}
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
    <div className="mb-6 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl transition hover:border-[var(--color-powder-blue)]/50"
        >
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
            {item.label}
          </p>
          <p className="mt-2 text-3xl font-black tabular-nums text-[var(--color-powder-blue)]">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
