'use client';

import { useDeferredValue, useState } from 'react';
import type { ParkDigest, ParkSummary } from '@/lib/api';
import type { ParkVisual } from '@/lib/park-content';
import ParkCard from '@/components/park-card';

type ParksExplorerProps = {
  parks: ParkSummary[];
  visuals: Record<string, ParkVisual>;
  digests?: Record<string, ParkDigest | null>;
};

export default function ParksExplorer({
  parks,
  visuals,
  digests = {},
}: ParksExplorerProps) {
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
          className="w-full rounded-full border border-white/10 bg-white/6 px-5 py-3 text-sm text-white shadow-[var(--shadow-card)] outline-none transition placeholder:text-white/38 focus:border-[var(--accent)]/45 focus:ring-2 focus:ring-[var(--accent)]/18"
        />
      </div>

      <div className="flex flex-col gap-2 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between">
        <p>
          {parks.length > 0
            ? 'Search for a park or scroll the full list.'
            : 'Will be available soon'}
        </p>
        <p>
          {parks.length > 0
            ? `Showing ${filteredParks.length} of ${parks.length} parks`
            : 'Will be available soon'}
        </p>
      </div>

      {filteredParks.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {filteredParks.map((park) => (
            <ParkCard
              key={park.slug}
              park={park}
              visual={visuals[park.slug]}
              digest={digests[park.slug]}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-6 text-sm text-white/65 shadow-[var(--shadow-card)]">
          {parks.length === 0
            ? 'Park data is temporarily unavailable. Start the API or reconnect it to repopulate this list.'
            : `No parks matched "${query}".`}
        </div>
      )}
    </div>
  );
}
