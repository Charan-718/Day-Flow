import { useQuery } from '@tanstack/react-query';
import { getHealthScore } from '../../services/admin';
import {
  ErrorState,
  LoadingSkeleton,
  PageHeader,
} from '../../components/ui';

export function WorkforceHealthPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['health-score'],
    queryFn: getHealthScore,
  });

  if (isLoading) return <LoadingSkeleton />;
  if (isError || !data) {
    return <ErrorState message="Failed to load health score" onRetry={() => refetch()} />;
  }

  const d = data as {
    score: number;
    formula: string;
    breakdown: Record<
      string,
      { weight: number; value: number; contribution: number }
    >;
    windowDays: number;
    pendingLeave: number;
  };

  return (
    <div>
      <PageHeader
        title="Workforce Health"
        subtitle="Deterministic rule-based score — not AI"
      />

      <div className="mb-6 flex items-end gap-6 rounded-lg border border-[var(--line)] bg-white p-6 shadow-[var(--shadow)]">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Score (0–100)
          </p>
          <p className="text-5xl font-semibold tabular-nums text-[var(--accent)]">
            {d.score}
          </p>
        </div>
        <div className="text-sm text-[var(--muted)]">
          <p className="font-mono text-xs">{d.formula}</p>
          <p className="mt-1">Window: last {d.windowDays} days · Pending leave: {d.pendingLeave}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {Object.entries(d.breakdown).map(([key, part]) => (
          <div
            key={key}
            className="rounded-lg border border-[var(--line)] bg-white p-4"
          >
            <p className="text-sm font-semibold capitalize">
              {key.replace(/([A-Z])/g, ' $1')}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Weight {(part.weight * 100).toFixed(0)}% · Value {part.value} · Contribution{' '}
              {part.contribution}
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded bg-[var(--bg)]">
              <div
                className="h-full rounded bg-[var(--accent)]"
                style={{ width: `${Math.min(100, part.value * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
