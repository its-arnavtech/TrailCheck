'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ParkPreference } from '@/lib/api';
import {
  AUTH_STATE_CHANGED_EVENT,
  PARK_PREFERENCES_CHANGED_EVENT,
  getStoredAuthToken,
} from '@/lib/auth';
import { getCachedParkPreferences } from '@/lib/park-preferences-store';

export default function FavoritesPanel() {
  const [isLoading, setIsLoading] = useState(true);
  const [favorites, setFavorites] = useState<ParkPreference[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadFavorites() {
      if (!getStoredAuthToken()) {
        setFavorites([]);
        setErrorMessage(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const preferences = await getCachedParkPreferences();
        setFavorites(preferences.filter((preference) => preference.isFavorite));
        setErrorMessage(null);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : 'Failed to load favorites.',
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadFavorites();
    window.addEventListener(AUTH_STATE_CHANGED_EVENT, loadFavorites);
    window.addEventListener(PARK_PREFERENCES_CHANGED_EVENT, loadFavorites);

    return () => {
      window.removeEventListener(AUTH_STATE_CHANGED_EVENT, loadFavorites);
      window.removeEventListener(PARK_PREFERENCES_CHANGED_EVENT, loadFavorites);
    };
  }, []);

  return (
    <div className="glass-panel topo-ring rounded-[1.75rem] p-5 text-white shadow-[var(--shadow-card)]">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-strong)]/62">
        Favorites
      </p>
      <h3 className="mt-3 text-3xl text-white" data-display="true">
        Your favorited parks
      </h3>
      <p className="mt-2 text-sm text-white/72">
        This list belongs to the signed-in account only.
      </p>

      {isLoading ? (
        <p className="mt-4 text-sm text-white/76">Loading favorites...</p>
      ) : errorMessage ? (
        <p className="mt-4 text-sm text-rose-300">{errorMessage}</p>
      ) : favorites.length > 0 ? (
        <div className="mt-4 space-y-2">
          {favorites.map((park) => (
            <Link
              key={park.parkSlug}
              href={`/parks/${park.parkSlug}`}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm transition hover:bg-white/10"
            >
              <span className="font-medium">{park.parkName}</span>
              <span className="text-white/62">{park.parkState}</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-white/76">
          You have not favorited any parks yet.
        </p>
      )}
    </div>
  );
}
