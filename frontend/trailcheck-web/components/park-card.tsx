'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ParkSummary, ParkDigest } from '@/lib/api';
import type { ParkVisual } from '@/lib/park-content';
import ParkFavoriteButton from '@/components/park-favorite-button';
import RiskBadge from '@/components/risk-badge';

type ParkCardProps = {
  park: ParkSummary;
  visual: ParkVisual;
  digest?: ParkDigest | null;
  featured?: boolean;
};

export default function ParkCard({ park, visual, digest, featured = false }: ParkCardProps) {
  const riskLevel = digest?.structuredOutput?.riskLevel ?? digest?.hazards[0]?.severity?.toUpperCase();

  return (
    <article className="group glass-panel topo-ring h-full overflow-hidden rounded-[1.5rem] transition duration-300 hover:-translate-y-1 hover:border-[var(--border-strong)]">
      <Link href={`/parks/${park.slug}`} className="block h-full">
        <div className={`relative overflow-hidden ${featured ? 'h-64' : 'h-56'}`}>
          <Image
            src={visual.imageUrl}
            alt={visual.imageAlt}
            fill
            sizes={featured ? '(min-width: 1024px) 33vw, 100vw' : '(min-width: 1536px) 25vw, (min-width: 640px) 50vw, 100vw'}
            className="object-cover transition duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,12,16,0.08),rgba(6,12,16,0.32)_42%,rgba(6,12,16,0.9)_100%)]" />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
            <span className="rounded-full border border-white/12 bg-black/24 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/74 backdrop-blur-md">
              {visual.eyebrow}
            </span>
            <ParkFavoriteButton
              parkSlug={park.slug}
              parkName={park.name}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/18 bg-black/24 text-white shadow-[0_12px_26px_rgba(0,0,0,0.24)] backdrop-blur-md transition hover:bg-black/36 disabled:cursor-not-allowed disabled:opacity-70"
              activeClassName="border-rose-300/26 bg-rose-500 text-white"
              inactiveClassName="border-white/18 bg-black/24 text-white hover:bg-black/36"
            />
          </div>
          <div className="absolute inset-x-0 bottom-0 p-5">
            {riskLevel ? <RiskBadge level={riskLevel} subtle /> : null}
            <h3 className="mt-3 text-3xl text-white" data-display="true">
              {park.name}
            </h3>
            <p className="mt-2 text-sm text-white/70">{park.state}</p>
          </div>
        </div>

        <div className="p-5">
          <p className="text-sm leading-6 text-white/72">{visual.tagline}</p>
          <div className="mt-5 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-[var(--accent-strong)]">
              {park.trails.length} trail{park.trails.length === 1 ? '' : 's'}
            </span>
            <span className="text-sm font-semibold text-white transition group-hover:text-[var(--accent-strong)]">
              Open park
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
