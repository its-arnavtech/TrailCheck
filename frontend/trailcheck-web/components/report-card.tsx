import type { TrailReport } from '@/lib/api';

type ReportCardProps = {
  report: TrailReport;
};

function formatSurfaceCondition(surfaceCondition: string) {
  return surfaceCondition
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^\w/, (char) => char.toUpperCase());
}

export default function ReportCard({ report }: ReportCardProps) {
  return (
    <article className="rounded-[1.35rem] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(20,36,44,0.84),rgba(11,21,27,0.84))] p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">
            {report.reporterName ?? 'Anonymous hiker'}
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/44">
            {formatSurfaceCondition(report.surfaceCondition)}
          </p>
        </div>
        <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-100">
          {'\u2605'.repeat(report.conditionRating)}
        </span>
      </div>
      <p className="mt-4 text-sm leading-6 text-white/76">
        {report.note || 'No additional notes were provided for this report.'}
      </p>
    </article>
  );
}
