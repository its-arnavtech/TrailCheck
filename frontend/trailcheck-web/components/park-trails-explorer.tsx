'use client';

import Link from 'next/link';
import { useDeferredValue, useState } from 'react';
import type { TrailSummary } from '@/lib/api';

type ParkTrailsExplorerProps = {
  trails: TrailSummary[];
};

export default function ParkTrailsExplorer({ trails }: ParkTrailsExplorerProps) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();

  const filteredTrails = normalizedQuery
    ? trails.filter((trail) => trail.name.toLowerCase().includes(normalizedQuery))
    : trails;

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
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search trails in this park"
          className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm text-[var(--foreground)] shadow-[var(--shadow-soft)] outline-none transition placeholder:text-[var(--foreground)]/42 focus:border-[var(--accent)]/45 focus:ring-2 focus:ring-[var(--accent)]/18"
        />
      </div>

      <div className="flex flex-col gap-2 text-sm text-[var(--foreground)]/60 sm:flex-row sm:items-center sm:justify-between">
        <p>Search by trail name or scroll the full list.</p>
        <p>Showing {filteredTrails.length} of {trails.length} trails</p>
      </div>

      {filteredTrails.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {filteredTrails.map((trail) => (
            <Link key={trail.id} href={`/trails/${trail.id}`} className="group">
              <article className="h-full rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)] backdrop-blur transition duration-200 hover:-translate-y-1 hover:border-[var(--accent)]/35 hover:bg-[var(--surface-strong)]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-strong)]">
                    Trail
                  </span>
                  <span className="text-sm text-[var(--foreground)]/45 transition group-hover:text-[var(--accent-strong)]">
                    View conditions
                  </span>
                </div>
                <h3 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
                  {trail.name}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--foreground)]/68">
                  Open the trail page for reports and current conditions.
                </p>
              </article>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--foreground)]/65 shadow-[var(--shadow-soft)]">
          No trails matched "{query}".
        </div>
      )}
    </div>
  );
}
