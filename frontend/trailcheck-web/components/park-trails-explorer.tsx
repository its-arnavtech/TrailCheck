'use client';

import Link from 'next/link';
import { useDeferredValue, useState } from 'react';
import type { TrailSummary } from '@/lib/api';

type ParkTrailsExplorerProps = {
  trails: TrailSummary[];
  parkName?: string;
  visualImageUrl?: string;
  mode?: 'preview' | 'full';
  theme?: 'light' | 'dark';
};

function TrailCard({
  trail,
  parkName,
  visualImageUrl,
  theme = 'light',
}: {
  trail: TrailSummary;
  parkName?: string;
  visualImageUrl?: string;
  theme?: 'light' | 'dark';
}) {
  const isDark = theme === 'dark';

  return (
    <Link key={trail.id} href={`/trails/${trail.id}`} className="group block">
      <article
        className={`h-full overflow-hidden rounded-[1.6rem] border shadow-[var(--shadow-soft)] transition duration-200 hover:-translate-y-1 ${
          isDark
            ? 'border-white/12 bg-[color:color-mix(in_srgb,var(--surface-strong)_74%,black_26%)] hover:border-white/22'
            : 'border-[var(--border)] bg-[var(--surface-strong)] hover:border-[var(--accent)]/30'
        }`}
      >
        <div className="relative h-44 overflow-hidden">
          {visualImageUrl ? (
            <img
              src={visualImageUrl}
              alt={`${trail.name} scenic preview`}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full bg-[linear-gradient(135deg,#c7d4e2,#91a7bf)]" />
          )}
          <div
            className={`absolute inset-0 ${
              isDark
                ? 'bg-[linear-gradient(180deg,rgba(10,16,22,0.04),rgba(6,10,16,0.58))]'
                : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(13,18,24,0.14))]'
            }`}
          />
          <div
            className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
              isDark ? 'bg-slate-950/56 text-white' : 'bg-white/88 text-slate-900'
            }`}
          >
            Trail
          </div>
        </div>

        <div className="space-y-3 p-5">
          <div className="space-y-2">
            <h3
              className={`text-xl font-semibold tracking-tight ${
                isDark ? 'text-white' : 'text-slate-950'
              }`}
            >
              {trail.name}
            </h3>
            <p className={`text-sm leading-6 ${isDark ? 'text-slate-200/88' : 'text-slate-700'}`}>
              Open the latest route detail page for conditions, hazards, weather, and recent
              reports.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {parkName ?? trail.park?.name}
            </span>
            <span
              className={`text-sm font-semibold transition ${
                isDark ? 'text-white group-hover:text-sky-200' : 'text-slate-950 group-hover:text-[var(--accent)]'
              }`}
            >
              View trail
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

export default function ParkTrailsExplorer({
  trails,
  parkName,
  visualImageUrl,
  mode = 'preview',
  theme = 'light',
}: ParkTrailsExplorerProps) {
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const previewCount = mode === 'full' ? 12 : 6;
  const isDark = theme === 'dark';

  const filteredTrails = normalizedQuery
    ? trails.filter((trail) => trail.name.toLowerCase().includes(normalizedQuery))
    : trails;
  const shouldShowAll = mode === 'full' || showAll || normalizedQuery.length > 0;
  const visibleTrails = shouldShowAll ? filteredTrails : filteredTrails.slice(0, previewCount);

  if (trails.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-5 text-sm leading-6 text-[var(--foreground)]/65 shadow-[var(--shadow-soft)]">
        Trail coverage is coming soon for this park. For now, you can still browse the full national
        park directory from the homepage.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p
            className={`text-sm font-semibold uppercase tracking-[0.24em] ${
              isDark ? 'text-slate-300/76' : 'text-[var(--accent-strong)]/72'
            }`}
          >
            {mode === 'full' ? 'All trails' : 'Trail highlights'}
          </p>
          <h2
            className={`mt-2 text-2xl font-semibold tracking-tight sm:text-3xl ${
              isDark ? 'text-white' : 'text-[var(--foreground)]'
            }`}
          >
            {mode === 'full'
              ? `Routes across ${parkName ?? 'this park'}`
              : 'Trail pages with room to breathe'}
          </h2>
          <p
            className={`mt-2 text-sm leading-7 ${
              isDark ? 'text-slate-300/82' : 'text-[var(--foreground)]/68'
            }`}
          >
            Search by trail name and jump straight into the route page for current conditions.
          </p>
        </div>

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
            className={`w-full rounded-full border px-5 py-3 text-sm shadow-sm outline-none transition ${
              isDark
                ? 'border-white/14 bg-slate-950/36 text-white placeholder:text-slate-400 focus:border-sky-300/45 focus:ring-4 focus:ring-sky-300/10'
                : 'border-[var(--border)] bg-white/84 text-slate-900 placeholder:text-slate-500 focus:border-[var(--accent)]/45 focus:ring-4 focus:ring-[var(--accent)]/12'
            }`}
          />
        </div>
      </div>

      <div
        className={`flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between ${
          isDark ? 'text-slate-300/76' : 'text-[var(--foreground)]/60'
        }`}
      >
        <p>
          {normalizedQuery
            ? 'Filtered by trail name.'
            : mode === 'full'
              ? 'A full route directory for this park.'
              : 'A cleaner preview that keeps the park overview balanced.'}
        </p>
        <p>
          Showing {visibleTrails.length} of{' '}
          {filteredTrails.length === trails.length ? trails.length : filteredTrails.length}
          {normalizedQuery ? ' matching' : ''} trails
        </p>
      </div>

      {visibleTrails.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visibleTrails.map((trail) => (
            <TrailCard
              key={trail.id}
              trail={trail}
              parkName={parkName}
              visualImageUrl={visualImageUrl}
              theme={theme}
            />
          ))}
        </div>
      ) : (
        <div
          className={`rounded-[1.5rem] border p-6 text-sm shadow-[var(--shadow-soft)] ${
            isDark
              ? 'border-white/12 bg-slate-950/28 text-slate-300/80'
              : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]/65'
          }`}
        >
          No trails matched &quot;{query}&quot;.
        </div>
      )}

      {!normalizedQuery && mode === 'preview' && trails.length > previewCount ? (
        <div className="flex justify-start">
          <button
            type="button"
            onClick={() => setShowAll((current) => !current)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              isDark
                ? 'border-white/12 bg-slate-950/20 text-white hover:border-white/22 hover:bg-slate-950/34'
                : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--accent)]/35 hover:bg-[var(--surface-strong)]'
            }`}
          >
            {showAll ? 'Show fewer routes' : `Preview more of the ${trails.length} routes`}
          </button>
        </div>
      ) : null}
    </div>
  );
}
