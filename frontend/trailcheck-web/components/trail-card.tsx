import Image from 'next/image';
import Link from 'next/link';
import type { TrailSummary } from '@/lib/api';
import RiskBadge from '@/components/risk-badge';

type TrailCardProps = {
  trail: TrailSummary;
  parkName?: string;
  visualImageUrl?: string;
  theme?: 'light' | 'dark';
  riskLevel?: string | null;
  status?: string | null;
};

export default function TrailCard({
  trail,
  parkName,
  visualImageUrl,
  theme = 'light',
  riskLevel,
  status,
}: TrailCardProps) {
  const isDark = theme === 'dark';

  return (
    <Link key={trail.id} href={`/trails/${trail.id}`} className="group block">
      <article
        className={`h-full overflow-hidden rounded-[1.6rem] border shadow-[var(--shadow-card)] transition duration-300 hover:-translate-y-1 ${
          isDark
            ? 'border-white/12 bg-[linear-gradient(180deg,rgba(20,35,44,0.76),rgba(8,15,20,0.84))] hover:border-white/20'
            : 'border-[var(--border)] bg-[linear-gradient(180deg,rgba(18,33,41,0.74),rgba(9,18,24,0.8))] hover:border-[var(--border-strong)]'
        }`}
      >
        <div className="relative h-44 overflow-hidden">
          {visualImageUrl ? (
            <Image
              src={visualImageUrl}
              alt={`${trail.name} scenic preview`}
              fill
              sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full bg-[linear-gradient(135deg,#547266,#17252d)]" />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,12,16,0.04),rgba(6,12,16,0.82))]" />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
            <span className="rounded-full border border-white/12 bg-black/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/72 backdrop-blur-sm">
              Trail route
            </span>
            {riskLevel ? <RiskBadge level={riskLevel} subtle /> : null}
          </div>
        </div>

        <div className="space-y-3 p-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-2xl text-white" data-display="true">
                {trail.name}
              </h3>
              {status ? (
                <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/68">
                  {status}
                </span>
              ) : null}
            </div>
            <p className="text-sm leading-6 text-white/70">
              Conditions, hazards, weather, and community reports in one focused trail page.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-white/56">
              {parkName ?? trail.park?.name}
            </span>
            <span className="text-sm font-semibold text-[var(--accent-strong)] transition group-hover:text-white">
              View trail
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
