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
    <div className="flex min-h-[160px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-8 py-10 text-center shadow-xl">
      {icon && (
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-background-deep)] text-[var(--color-powder-blue)] shadow-inner">
          {icon}
        </div>
      )}
      <p className="text-[var(--font-size-base)] font-bold text-[var(--color-text)]">{title}</p>
      {hint && <p className="mt-1.5 text-xs font-medium text-[var(--color-text-secondary)]">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-12 animate-pulse rounded-xl bg-[var(--color-border)]/60"
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
    <div className="rounded-2xl border border-[var(--color-bordeaux-main)]/40 bg-[var(--color-bordeaux-alpha-15)] px-6 py-8 text-center shadow-lg">
      <p className="text-base font-semibold text-[#ff7b79]">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex h-9 cursor-pointer items-center rounded-xl bg-white/10 px-4 text-sm font-bold text-[var(--color-powder-blue)] hover:bg-white/20 transition-colors focus-visible:outline-none"
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
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-border)]/80 pb-6">
      <div>
        <h1 className="text-[var(--font-size-lg)] font-black tracking-tight text-[var(--color-heading)]">{title}</h1>
        {subtitle && <p className="mt-2 text-[var(--font-size-base)] font-medium text-[var(--color-text-secondary)]">{subtitle}</p>}
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
    <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-7 shadow-xl transition hover:border-[var(--color-powder-blue)]/50"
        >
          <p className="text-[var(--font-size-xs)] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
            {item.label}
          </p>
          <p className="mt-3 text-[var(--font-size-md)] font-black tabular-nums text-[var(--color-powder-blue)]">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
