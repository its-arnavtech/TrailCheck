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
      <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-4 text-sm leading-6 text-white/68">
        Trail reporting will be available here once trail coverage is added for this park.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className={flush ? '' : 'rounded-[1.45rem] border border-white/10 bg-white/6 px-4 py-4'}>
        <label
          htmlFor="park-report-trail"
          className={`mb-2 block text-sm font-semibold text-white/72 ${flush ? 'px-0' : ''}`}
        >
          Choose a trail to report on
        </label>
        <select
          id="park-report-trail"
          value={selectedTrailId ?? ''}
          onChange={(event) => setSelectedTrailId(Number(event.target.value))}
          className="w-full rounded-[1.1rem] border border-white/10 bg-[rgba(6,12,16,0.42)] px-4 py-3 text-sm text-white shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
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
