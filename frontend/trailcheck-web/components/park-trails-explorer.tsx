"use client";

import { useDeferredValue, useState } from "react";
import type { TrailSummary } from "@/lib/api";
import TrailCard from "@/components/trail-card";

type ParkTrailsExplorerProps = {
  trails: TrailSummary[];
  parkName?: string;
  visualImageUrl?: string;
  mode?: "preview" | "full";
  theme?: "light" | "dark";
};

export default function ParkTrailsExplorer({
  trails,
  parkName,
  visualImageUrl,
  mode = "preview",
  theme = "light",
}: ParkTrailsExplorerProps) {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const previewCount = mode === "full" ? 12 : 6;
  const isDark = theme === "dark";

  const filteredTrails = normalizedQuery
    ? trails.filter((trail) =>
        trail.name.toLowerCase().includes(normalizedQuery),
      )
    : trails;
  const shouldShowAll =
    mode === "full" || showAll || normalizedQuery.length > 0;
  const visibleTrails = shouldShowAll
    ? filteredTrails
    : filteredTrails.slice(0, previewCount);

  if (trails.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-ink/10 bg-[var(--surface-muted)] p-5 text-sm leading-6 text-ink/65 shadow-[var(--shadow-card)]">
        Trail coverage is coming soon for this park. For now, you can still
        browse the full national park directory from the homepage.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p
            className={`text-sm font-semibold uppercase tracking-[0.24em] ${
              isDark ? "text-slate-300/76" : "text-[var(--accent-strong)]/72"
            }`}
          >
            {mode === "full" ? "All trails" : "Trail highlights"}
          </p>
          <h2
            className="mt-2 text-2xl text-ink sm:text-3xl"
            data-display="true"
          >
            {mode === "full"
              ? `Routes across ${parkName ?? "this park"}`
              : "Find your next trail"}
          </h2>
          <p
            className={`mt-2 text-sm leading-7 ${isDark ? "text-slate-300/82" : "text-ink/68"}`}
          >
            Search by trail name and jump straight into the route page for
            current conditions.
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
                ? "border-ink/14 bg-slate-950/36 text-ink placeholder:text-slate-400 focus:border-sky-300/45 focus:ring-4 focus:ring-sky-300/10"
                : "border-ink/10 bg-[var(--surface-muted)] text-ink placeholder:text-ink/38 focus:border-[var(--accent)]/45 focus:ring-4 focus:ring-[var(--accent)]/12"
            }`}
          />
        </div>
      </div>

      <div
        className={`flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between ${
          isDark ? "text-slate-300/76" : "text-ink/60"
        }`}
      >
        <p>
          {normalizedQuery
            ? "Filtered by trail name."
            : mode === "full"
              ? "A full route directory for this park."
              : "A few routes to start exploring."}
        </p>
        <p>
          Showing {visibleTrails.length} of{" "}
          {filteredTrails.length === trails.length
            ? trails.length
            : filteredTrails.length}
          {normalizedQuery ? " matching" : ""}{" "}
          {filteredTrails.length === 1 ? "trail" : "trails"}
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
          className={`rounded-[1.5rem] border p-6 text-sm shadow-[var(--shadow-card)] ${
            isDark
              ? "border-ink/12 bg-slate-950/28 text-slate-300/80"
              : "border-ink/10 bg-[var(--surface-muted)] text-ink/65"
          }`}
        >
          No trails matched &quot;{query}&quot;.
        </div>
      )}

      {!normalizedQuery &&
      mode === "preview" &&
      trails.length > previewCount ? (
        <div className="flex justify-start">
          <button
            type="button"
            onClick={() => setShowAll((current) => !current)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              isDark
                ? "border-ink/12 bg-slate-950/20 text-ink hover:border-ink/22 hover:bg-slate-950/34"
                : "border-ink/10 bg-[var(--surface-muted)] text-ink hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)]"
            }`}
          >
            {showAll
              ? "Show fewer routes"
              : `Preview more of the ${trails.length} routes`}
          </button>
        </div>
      ) : null}
    </div>
  );
}
