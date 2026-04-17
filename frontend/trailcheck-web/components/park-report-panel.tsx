'use client';

import { useMemo, useState } from 'react';
import type { TrailSummary } from '@/lib/api';
import ReportForm from '@/components/reportform';

type ParkReportPanelProps = {
  trails: TrailSummary[];
  flush?: boolean;
};

export default function ParkReportPanel({ trails, flush = false }: ParkReportPanelProps) {
  const selectableTrails = useMemo(() => trails.filter((trail) => typeof trail.id === 'number'), [trails]);
  const [selectedTrailId, setSelectedTrailId] = useState<number | null>(
    selectableTrails[0]?.id ?? null,
  );

  if (selectableTrails.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]/80 px-4 py-4 text-sm leading-6 text-[var(--foreground)]/68">
        Trail reporting will be available here once trail coverage is added for this park.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className={flush ? '' : 'rounded-[1.45rem] border border-[var(--border)] bg-[var(--surface)] px-4 py-4'}>
        <label
          htmlFor="park-report-trail"
          className={`mb-2 block text-sm font-semibold text-[var(--foreground)]/72 ${flush ? 'px-0' : ''}`}
        >
          Choose a trail to report on
        </label>
        <select
          id="park-report-trail"
          value={selectedTrailId ?? ''}
          onChange={(event) => setSelectedTrailId(Number(event.target.value))}
          className="w-full rounded-[1.1rem] border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--ink-on-light)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
        >
          {selectableTrails.map((trail) => (
            <option key={trail.id} value={trail.id}>
              {trail.name}
            </option>
          ))}
        </select>
      </div>

      {selectedTrailId ? <ReportForm trailId={selectedTrailId} flush={flush} /> : null}
    </div>
  );
}
