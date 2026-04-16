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
    <div className="rounded-[1.75rem] border border-white/35 bg-[rgba(12,19,27,0.82)] p-5 text-white shadow-[0_24px_50px_rgba(15,23,42,0.28)] backdrop-blur-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/65">
        Favorites
      </p>
      <h3 className="mt-2 text-xl font-semibold tracking-tight">
        Your favorited parks
      </h3>
      <p className="mt-2 text-sm text-white/78">
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
              className="flex items-center justify-between rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm transition hover:bg-white/14"
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
