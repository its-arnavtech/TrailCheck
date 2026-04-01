'use client';

import { useMemo, useState } from 'react';
import type { TrailSummary } from '@/lib/api';
import ReportForm from '@/components/reportform';

type ParkReportPanelProps = {
  trails: TrailSummary[];
};

export default function ParkReportPanel({ trails }: ParkReportPanelProps) {
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
    <div className="space-y-4">
      <div>
        <label
          htmlFor="park-report-trail"
          className="mb-2 block text-sm font-medium text-[var(--foreground)]/72"
        >
          Choose a trail to report on
        </label>
        <select
          id="park-report-trail"
          value={selectedTrailId ?? ''}
          onChange={(event) => setSelectedTrailId(Number(event.target.value))}
          className="w-full rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3 text-sm text-[var(--foreground)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-emerald-100"
        >
          {selectableTrails.map((trail) => (
            <option key={trail.id} value={trail.id}>
              {trail.name}
            </option>
          ))}
        </select>
      </div>

      {selectedTrailId ? <ReportForm trailId={selectedTrailId} /> : null}
    </div>
  );
}
