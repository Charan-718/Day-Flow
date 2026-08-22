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
    <div>
      <PageHeader title="Workforce Health" subtitle="Deterministic rule-based score — not AI" />

      <div className="mb-6 flex flex-col gap-4 rounded-lg border border-[var(--line)] bg-white p-6 shadow-[var(--shadow)] sm:flex-row sm:items-end sm:gap-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Score (0–100)</p>
          <p className="text-5xl font-semibold tabular-nums text-[var(--accent)]">{d.score}</p>
        </div>
        <div className="text-sm text-[var(--muted)]">
          <p className="font-mono text-xs">{d.formula}</p>
          <p className="mt-1">
            Window: last {d.windowDays} days · Pending leave: {d.pendingLeave}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {Object.entries(d.breakdown).map(([key, part]) => {
          const label = key.replace(/([A-Z])/g, ' $1').trim();
          const displayLabel = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
          const pct = Math.min(100, Math.round(part.value * 100));
          return (
            <div key={key} className="rounded-lg border border-[var(--line)] bg-white p-4">
              <p className="text-sm font-semibold text-[var(--ink)]">{displayLabel}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Weight {(part.weight * 100).toFixed(0)}% · Value {part.value} · Contribution {part.contribution}
              </p>
              <div
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${displayLabel}: ${pct}%`}
                className="mt-3 h-2 overflow-hidden rounded bg-[var(--bg)]"
              >
                <div className="h-full rounded bg-[var(--accent)] transition-[width]" style={{ width: `${pct}%` }} />
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
    <div aria-busy="true" aria-label="Loading workforce health score">
      <div className="mb-5 h-6 w-52 animate-pulse rounded bg-[var(--line)]/60" />
      <div className="mb-6 h-28 animate-pulse rounded-lg bg-[var(--line)]/40" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-[var(--line)]/40" />
        ))}
      </div>
    </div>
  );
}
