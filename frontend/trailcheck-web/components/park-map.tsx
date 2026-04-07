'use client';

import Image from 'next/image';
import Link from 'next/link';
import { PARK_MAP_PARKS, type ParkMapRegion } from '@/lib/park-map-data';

const REGION_LABELS: Record<ParkMapRegion, string> = {
  mainland: 'Lower 48',
  alaska: 'Alaska',
  hawaii: 'Hawaii',
  pacific: 'American Samoa',
  caribbean: 'Virgin Islands',
};

const REGION_IMAGES: Partial<Record<ParkMapRegion, string>> = {
  alaska: '/Map_of_Alaska.jpg',
  hawaii: '/Map_of_Hawaii.jpg',
  pacific: '/Map_of_Samoa.png',
  caribbean: '/Map_of_Virgin_islands.jpg',
};

function ParkPin({
  slug,
  name,
  state,
  x,
  y,
  compact = false,
}: {
  slug: string;
  name: string;
  state: string;
  x: number;
  y: number;
  compact?: boolean;
}) {
  return (
    <Link
      href={`/parks/${slug}`}
      className="group absolute -translate-x-1/2 -translate-y-full focus:outline-none"
      style={{ left: `${x}%`, top: `${y}%` }}
      aria-label={name}
    >
      <span
        className={`relative block rounded-full border border-white/80 bg-[radial-gradient(circle_at_30%_30%,#fef3c7,#f97316_62%,#c2410c)] shadow-[0_10px_24px_rgba(15,23,42,0.35)] transition duration-200 group-hover:scale-110 group-focus-visible:scale-110 ${
          compact ? 'h-3.5 w-3.5' : 'h-4 w-4'
        }`}
      >
        <span className="absolute left-1/2 top-[78%] h-2.5 w-2.5 -translate-x-1/2 rotate-45 rounded-[2px] border-r border-b border-white/70 bg-[#ea580c]" />
        <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90" />
      </span>
      <span className="pointer-events-none absolute left-1/2 top-0 z-10 hidden w-max max-w-[14rem] -translate-x-1/2 -translate-y-[calc(100%+0.8rem)] rounded-2xl border border-white/18 bg-[rgba(9,16,24,0.94)] px-3 py-2 text-center text-xs font-medium text-white shadow-[0_18px_40px_rgba(0,0,0,0.32)] group-hover:block group-focus-visible:block">
        {name}
        <span className="mt-0.5 block text-[11px] font-normal text-white/65">{state}</span>
      </span>
    </Link>
  );
}

function RegionPanel({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[1.6rem] border border-white/16 bg-[linear-gradient(180deg,rgba(9,18,27,0.62),rgba(17,28,39,0.76))] ${className ?? ''}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_28%)]" />
      <div className="pointer-events-none absolute left-4 top-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/62">
        {title}
      </div>
      {children}
    </div>
  );
}

export default function ParkMap() {
  const mainlandParks = PARK_MAP_PARKS.filter((park) => park.region === 'mainland');
  const insetRegions = (['alaska', 'hawaii', 'pacific', 'caribbean'] as const).map((region) => ({
    region,
    parks: PARK_MAP_PARKS.filter((park) => park.region === region),
  }));

  return (
    <section className="w-full max-w-[40rem] rounded-[2rem] border border-white/18 bg-[rgba(10,18,28,0.48)] p-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/62">
            Park Map
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">
            Hover across all 63 national parks
          </h2>
        </div>
        <p className="max-w-[10rem] text-right text-xs leading-5 text-white/68 sm:text-sm">
          Every pin opens a park page and shows its name on hover.
        </p>
      </div>

      <RegionPanel title={REGION_LABELS.mainland} className="mt-4 p-4 pt-9">
        <div className="relative aspect-[1.55/1] overflow-hidden rounded-[1.3rem] bg-[#d7e5ef]">
          <Image
            src="/Map_of_US.jpg"
            alt="Map of the United States with TrailCheck national park pins."
            fill
            priority
            className="object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(7,12,18,0.02),rgba(7,12,18,0.12))]" />

          {mainlandParks.map((park) => (
            <ParkPin
              key={park.slug}
              slug={park.slug}
              name={park.name}
              state={park.state}
              x={park.x}
              y={park.y}
            />
          ))}
        </div>
      </RegionPanel>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {insetRegions.map(({ region, parks }) => (
          <RegionPanel key={region} title={REGION_LABELS[region]} className="p-3 pt-8">
            <div className="relative aspect-[1.5/1] overflow-hidden rounded-[1.1rem] bg-[#d7e5ef]">
              {REGION_IMAGES[region] ? (
                <Image
                  src={REGION_IMAGES[region]!}
                  alt={`${REGION_LABELS[region]} map with TrailCheck park pins.`}
                  fill
                  className="object-cover"
                />
              ) : null}
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(7,12,18,0.02),rgba(7,12,18,0.12))]" />
              {parks.map((park) => (
                <ParkPin
                  key={park.slug}
                  slug={park.slug}
                  name={park.name}
                  state={park.state}
                  x={park.x}
                  y={park.y}
                  compact
                />
              ))}
            </div>
          </RegionPanel>
        ))}
      </div>
    </section>
  );
}
