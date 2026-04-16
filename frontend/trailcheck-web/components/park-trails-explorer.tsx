'use client';

import Link from 'next/link';
import { useDeferredValue, useState } from 'react';
import type { TrailSummary } from '@/lib/api';

type ParkTrailsExplorerProps = {
  trails: TrailSummary[];
};

export default function ParkTrailsExplorer({ trails }: ParkTrailsExplorerProps) {
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const previewCount = 8;

  const filteredTrails = normalizedQuery
    ? trails.filter((trail) => trail.name.toLowerCase().includes(normalizedQuery))
    : trails;
  const shouldShowAll = showAll || normalizedQuery.length > 0;
  const visibleTrails = shouldShowAll ? filteredTrails : filteredTrails.slice(0, previewCount);

  if (trails.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-5 text-sm leading-6 text-[var(--foreground)]/65 shadow-[var(--shadow-soft)]">
        Trail coverage is coming soon for this park. For now, you can still browse the full national park directory from the homepage.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="w-full max-w-xl">
        <label htmlFor="trail-search" className="sr-only">
          Search trails
        </label>
        <input
          id="trail-search"
          type="search"
          value={query}
          onChange={(event) => {
            const nextQuery = event.target.value;
            setQuery(nextQuery);

            if (nextQuery.trim()) {
              setShowAll(true);
            }
          }}
          placeholder="Search trails in this park"
          className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm text-[var(--foreground)] shadow-[var(--shadow-soft)] outline-none transition placeholder:text-[var(--foreground)]/42 focus:border-[var(--accent)]/45 focus:ring-2 focus:ring-[var(--accent)]/18"
        />
      </div>

      <div className="flex flex-col gap-2 text-sm text-[var(--foreground)]/60 sm:flex-row sm:items-center sm:justify-between">
        <p>
          {normalizedQuery
            ? 'Search by trail name to narrow the park route list.'
            : 'Previewing a few routes here to keep the park overview balanced.'}
        </p>
        <p>
          Showing {visibleTrails.length} of {filteredTrails.length === trails.length ? trails.length : filteredTrails.length}
          {normalizedQuery ? ' matching' : ''} trails
        </p>
      </div>

      {visibleTrails.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {visibleTrails.map((trail) => (
            <Link key={trail.id} href={`/trails/${trail.id}`} className="group">
              <article className="h-full rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)] backdrop-blur transition duration-200 hover:-translate-y-1 hover:border-[var(--accent)]/35 hover:bg-[var(--surface-strong)]">
                <div className="flex flex-col gap-3">
                  <h3 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
                    {trail.name}
                  </h3>
                  <span className="text-sm font-medium text-[var(--foreground)]/52 transition group-hover:text-[var(--accent-strong)]">
                    View conditions
                  </span>
                </div>
              </article>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--foreground)]/65 shadow-[var(--shadow-soft)]">
          No trails matched &quot;{query}&quot;.
        </div>
      )}

      {!normalizedQuery && trails.length > previewCount ? (
        <div className="flex justify-start">
          <button
            type="button"
            onClick={() => setShowAll((current) => !current)}
            className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)]/35 hover:bg-[var(--surface-strong)]"
          >
            {showAll ? 'Show fewer routes' : `View all ${trails.length} routes`}
          </button>
        </div>
      ) : null}
    </div>
  );
}
