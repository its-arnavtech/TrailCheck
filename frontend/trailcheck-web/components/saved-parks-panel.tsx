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

export default function SavedParksPanel() {
  const [isLoading, setIsLoading] = useState(true);
  const [preferences, setPreferences] = useState<ParkPreference[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadPreferences() {
      if (!getStoredAuthToken()) {
        setPreferences([]);
        setErrorMessage(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const savedPreferences = await getCachedParkPreferences();
        setPreferences(savedPreferences);
        setErrorMessage(null);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : 'Failed to load saved parks.',
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadPreferences();
    window.addEventListener(AUTH_STATE_CHANGED_EVENT, loadPreferences);
    window.addEventListener(PARK_PREFERENCES_CHANGED_EVENT, loadPreferences);

    return () => {
      window.removeEventListener(AUTH_STATE_CHANGED_EVENT, loadPreferences);
      window.removeEventListener(
        PARK_PREFERENCES_CHANGED_EVENT,
        loadPreferences,
      );
    };
  }, []);

  const favorites = preferences.filter((preference) => preference.isFavorite);
  const wantToGo = preferences.filter((preference) => preference.wantsToGo);

  return (
    <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
        Saved Parks
      </p>
      <p className="mt-2 text-sm opacity-80">
        Build your own favorites list and a separate want-to-go list.
      </p>

      {isLoading ? (
        <p className="mt-4 text-sm opacity-75">Loading your saved parks...</p>
      ) : errorMessage ? (
        <p className="mt-4 text-sm text-rose-300">{errorMessage}</p>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <SavedParkList
            title="Favorites"
            emptyMessage="You have not favorited any parks yet."
            parks={favorites}
          />
          <SavedParkList
            title="Want to go"
            emptyMessage="You have not added any parks to your want-to-go list yet."
            parks={wantToGo}
          />
        </div>
      )}
    </div>
  );
}

type SavedParkListProps = {
  title: string;
  emptyMessage: string;
  parks: ParkPreference[];
};

function SavedParkList({ title, emptyMessage, parks }: SavedParkListProps) {
  return (
    <section className="rounded-[1.2rem] border border-current/10 bg-white/8 p-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold tracking-tight">{title}</h4>
        <span className="rounded-full border border-current/10 px-2.5 py-1 text-xs opacity-75">
          {parks.length}
        </span>
      </div>

      {parks.length > 0 ? (
        <div className="mt-3 space-y-2">
          {parks.map((park) => (
            <Link
              key={`${title}-${park.parkSlug}`}
              href={`/parks/${park.parkSlug}`}
              className="flex items-center justify-between rounded-2xl border border-current/10 bg-white/10 px-3 py-3 text-sm transition hover:bg-white/16"
            >
              <span className="font-medium">{park.parkName}</span>
              <span className="opacity-65">{park.parkState}</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm opacity-72">{emptyMessage}</p>
      )}
    </section>
  );
}
