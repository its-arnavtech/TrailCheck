"use client";
import { useDeferredValue, useState } from "react";
import type { ParkDigest, ParkSummary } from "@/lib/api";
import type { ParkVisual } from "@/lib/park-content";
import ParkCard from "@/components/park-card";
import Icon from "@/components/ui-icon";
type Props = {
  parks: ParkSummary[];
  visuals: Record<string, ParkVisual>;
  digests?: Record<string, ParkDigest | null>;
  available?: boolean;
};
export default function ParksExplorer({
  parks,
  visuals,
  available = true,
}: Props) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState("");
  const [limit, setLimit] = useState(9);
  const normalized = useDeferredValue(query).trim().toLowerCase();
  const states = [
    ...new Set(
      parks.flatMap((park) => park.state.split(",").map((part) => part.trim())),
    ),
  ].sort();
  const filtered = parks.filter(
    (park) =>
      (!normalized ||
        `${park.name} ${park.state}`.toLowerCase().includes(normalized)) &&
      (!state ||
        park.state
          .split(",")
          .map((part) => part.trim())
          .includes(state)),
  );
  const visible = filtered.slice(0, limit);
  return (
    <div>
      <div className="explorer-toolbar">
        <div className="search-field">
          <Icon name="search" />
          <label htmlFor="park-search" className="sr-only">
            Search by park name or state
          </label>
          <input
            id="park-search"
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setLimit(9);
            }}
            placeholder="Where do you want to wander?"
          />
        </div>
        <label className="state-filter">
          <span className="sr-only">Filter by state</span>
          <select
            value={state}
            onChange={(event) => {
              setState(event.target.value);
              setLimit(9);
            }}
          >
            <option value="">All states & territories</option>
            {states.map((entry) => (
              <option key={entry}>{entry}</option>
            ))}
          </select>
        </label>
        <span className="explorer-count" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? "park" : "parks"} to
          discover
        </span>
      </div>
      {!available && (
        <p className="availability-note" role="status">
          The park directory is available. Live conditions and trail details are
          temporarily offline.
        </p>
      )}
      {visible.length ? (
        <div className="catalog-grid">
          {visible.map((park) => (
            <ParkCard
              key={park.slug}
              park={park}
              visual={visuals[park.slug]}
              available={available}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Icon name="search" size={32} />
          <h3>No parks found.</h3>
          <p>Try another park name or choose a different state.</p>
          <button
            className="button button-forest"
            onClick={() => {
              setQuery("");
              setState("");
            }}
          >
            Clear filters
          </button>
        </div>
      )}
      {visible.length < filtered.length && (
        <div className="load-more">
          <button
            className="button button-outline"
            onClick={() => setLimit((value) => value + 9)}
          >
            Explore more parks <Icon name="arrow" size={17} />
          </button>
          <p>
            Showing {visible.length} of {filtered.length}
          </p>
        </div>
      )}
    </div>
  );
}
