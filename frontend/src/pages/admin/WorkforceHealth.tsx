import { useQuery } from '@tanstack/react-query';
import { getHealthScore } from '../../services/admin';
import { ErrorState, PageHeader } from '../../components/ui';
import { getApiError } from '../../api/client';

export function WorkforceHealthPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['health-score'],
    queryFn: getHealthScore,
  });

  if (isLoading) return <Skeleton />;
  if (isError || !data) {
    return <ErrorState message={getApiError(error).message} onRetry={() => refetch()} />;
  }

  const d = data as {
    score: number;
    formula: string;
    breakdown: Record<string, { weight: number; value: number; contribution: number }>;
    windowDays: number;
    pendingLeave: number;
  };

  return (
    <div className="w-full space-y-6">
      <PageHeader title="Workforce Health" subtitle="Deterministic rule-based score — not AI" />

      {/* Main Score Banner */}
      <div className="mb-6 flex flex-col gap-6 rounded-2xl border border-[var(--color-powder-blue)]/60 bg-[var(--color-surface)] p-6 sm:p-8 shadow-xl sm:flex-row sm:items-center sm:justify-between transition-all hover:border-[var(--color-powder-blue)] hover:shadow-[0_0_20px_rgba(176,255,61,0.2)]">
        <div className="flex items-center gap-6">
          <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-2xl border border-[var(--color-powder-blue)]/50 bg-[var(--color-background-deep)] shadow-inner">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Score</span>
            <span className="text-4xl font-black tabular-nums text-[var(--color-powder-blue)] drop-shadow-[0_0_12px_rgba(176,255,61,0.3)]">
              {d.score}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight text-[var(--color-powder-blue)]">Overall Workforce Score</h2>
            <p className="mt-1 text-xs font-semibold text-[var(--color-primary-hover)]">
              Window: last {d.windowDays} days · Pending leave requests: <span className="text-[var(--color-powder-blue)] font-bold">{d.pendingLeave}</span>
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--color-border)]/80 bg-[var(--color-background-deep)] p-4 shadow-inner">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Algorithm Formula</p>
          <p className="mt-1 font-mono text-xs font-semibold text-[var(--color-powder-blue)]">
            {d.formula}
          </p>
        </div>
      </div>

      {/* Component Breakdown Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {Object.entries(d.breakdown).map(([key, part]) => {
          const label = key.replace(/([A-Z])/g, ' $1').trim();
          const displayLabel = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
          const pct = Math.min(100, Math.round(part.value * 100));
          return (
            <div
              key={key}
              className="group rounded-2xl border border-[var(--color-powder-blue)]/60 bg-[var(--color-surface)] p-6 shadow-xl transition-all hover:border-[var(--color-powder-blue)] hover:shadow-[0_0_20px_rgba(176,255,61,0.25)]"
            >
              <div className="flex items-center justify-between">
                <p className="text-base font-extrabold tracking-tight text-[var(--color-powder-blue)]">{displayLabel}</p>
                <span className="rounded-lg bg-[var(--color-background-deep)] px-2.5 py-1 text-xs font-bold text-[var(--color-powder-blue)] border border-[var(--color-powder-blue)]/40">
                  {pct}%
                </span>
              </div>
              <p className="mt-2 text-xs font-semibold text-[var(--color-primary-hover)]">
                Weight <span className="text-[var(--color-powder-blue)] font-bold">{(part.weight * 100).toFixed(0)}%</span> · Value{' '}
                <span className="text-[var(--color-powder-blue)] font-bold">{part.value}</span> · Contribution{' '}
                <span className="text-[var(--color-powder-blue)] font-bold">{part.contribution}</span>
              </p>
              <div
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${displayLabel}: ${pct}%`}
                className="mt-4 h-3 overflow-hidden rounded-full border border-[var(--color-border)]/60 bg-[var(--color-background-deep)]"
              >
                <div
                  className="h-full rounded-full bg-[var(--color-powder-blue)] transition-[width] duration-500 shadow-[0_0_10px_rgba(176,255,61,0.4)]"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div aria-busy="true" aria-label="Loading workforce health score" className="space-y-6">
      <div className="h-6 w-52 animate-pulse rounded bg-[var(--color-border)]/60" />
      <div className="h-32 animate-pulse rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]" />
        ))}
      </div>
    </div>
  );
}

