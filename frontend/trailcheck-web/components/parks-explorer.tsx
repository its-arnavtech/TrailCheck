'use client';

import { useDeferredValue, useState } from 'react';
import Link from 'next/link';
import type { ParkSummary } from '@/lib/api';
import type { ParkVisual } from '@/lib/park-content';
import ParkFavoriteButton from '@/components/park-favorite-button';

type ParksExplorerProps = {
  parks: ParkSummary[];
  visuals: Record<string, ParkVisual>;
};

export default function ParksExplorer({ parks, visuals }: ParksExplorerProps) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();

  const filteredParks = normalizedQuery
    ? parks.filter((park) => `${park.name} ${park.state}`.toLowerCase().includes(normalizedQuery))
    : parks;

  return (
    <div className="space-y-5">
      <div className="w-full max-w-xl">
        <label htmlFor="park-search" className="sr-only">
          Search parks
        </label>
        <input
          id="park-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by park name or state"
          className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm text-[var(--foreground)] shadow-[var(--shadow-soft)] outline-none transition placeholder:text-[var(--foreground)]/42 focus:border-[var(--accent)]/45 focus:ring-2 focus:ring-[var(--accent)]/18"
        />
      </div>

      <div className="flex flex-col gap-2 text-sm text-[var(--foreground)]/60 sm:flex-row sm:items-center sm:justify-between">
        <p>Search for a park or scroll the full list.</p>
        <p>Showing {filteredParks.length} of {parks.length} parks</p>
      </div>

      {filteredParks.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {filteredParks.map((park) => {
            const visual = visuals[park.slug];

            return (
              <article
                key={park.slug}
                className="group h-full overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)] backdrop-blur transition duration-200 hover:border-[var(--accent)]/35 hover:bg-[var(--surface-strong)]"
              >
                <Link href={`/parks/${park.slug}`} className="block h-full">
                  <div className="relative h-52 overflow-hidden">
                    <img
                      src={visual.imageUrl}
                      alt={visual.imageAlt}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/78 via-slate-900/18 to-transparent" />
                    <div className="absolute right-4 top-4 z-10">
                      <ParkFavoriteButton
                        parkSlug={park.slug}
                        parkName={park.name}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-slate-950/42 text-white shadow-[0_16px_30px_rgba(15,23,42,0.28)] backdrop-blur-md transition hover:bg-slate-950/58 disabled:cursor-not-allowed disabled:opacity-70"
                        activeClassName="border-rose-200 bg-rose-500 text-white"
                        inactiveClassName="border-white/30 bg-slate-950/42 text-white hover:bg-slate-950/58"
                      />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/78">
                        {visual.eyebrow}
                      </p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-tight">
                        {park.name}
                      </h3>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold tracking-[0.04em] text-[var(--accent-strong)]">
                        {park.state}
                      </span>
                      <span className="text-sm text-[var(--foreground)]/45 transition group-hover:text-[var(--accent-strong)]">
                        {park.trails.length > 0 ? 'Browse trails' : 'View park'}
                      </span>
                    </div>
                    <p className="text-sm leading-6 text-[var(--foreground)]/68">
                      {visual.tagline}
                    </p>
                    <p className="mt-3 text-sm font-medium text-[var(--accent-strong)]">
                      {park.trails.length > 0
                        ? `${park.trails.length} available trail${park.trails.length === 1 ? '' : 's'}`
                        : 'Trail coverage coming soon'}
                    </p>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--foreground)]/65 shadow-[var(--shadow-soft)]">
          No parks matched &quot;{query}&quot;.
        </div>
      )}
    </div>
  );
}
