'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  type ParkPreference,
  updateParkPreference,
} from '@/lib/api';
import {
  AUTH_STATE_CHANGED_EVENT,
  PARK_PREFERENCES_CHANGED_EVENT,
  getStoredAuthToken,
  notifyParkPreferencesChanged,
} from '@/lib/auth';
import ParkFavoriteButton from '@/components/park-favorite-button';
import { getCachedParkPreferences } from '@/lib/park-preferences-store';

type ParkPreferenceActionsProps = {
  parkSlug: string;
  parkName: string;
};

const emptyPreference = {
  parkId: 0,
  parkSlug: '',
  parkName: '',
  parkState: '',
  isFavorite: false,
  wantsToGo: false,
} satisfies ParkPreference;

export default function ParkPreferenceActions({
  parkSlug,
  parkName,
}: ParkPreferenceActionsProps) {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [preference, setPreference] = useState<ParkPreference>(emptyPreference);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function syncPreference() {
      const token = getStoredAuthToken();
      const signedIn = Boolean(token);

      setIsSignedIn(signedIn);

      if (!signedIn) {
        setPreference(emptyPreference);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const preferences = await getCachedParkPreferences();
        const nextPreference =
          preferences.find((entry) => entry.parkSlug === parkSlug) ??
          emptyPreference;
        setPreference({
          ...nextPreference,
          parkSlug,
          parkName: nextPreference.parkName || parkName,
        });
      } catch {
        setPreference(emptyPreference);
      } finally {
        setIsLoading(false);
      }
    }

    syncPreference();
    window.addEventListener(AUTH_STATE_CHANGED_EVENT, syncPreference);
    window.addEventListener(PARK_PREFERENCES_CHANGED_EVENT, syncPreference);

    return () => {
      window.removeEventListener(AUTH_STATE_CHANGED_EVENT, syncPreference);
      window.removeEventListener(PARK_PREFERENCES_CHANGED_EVENT, syncPreference);
    };
  }, [parkName, parkSlug]);

  async function savePreference(nextPreference: ParkPreference) {
    if (!isSignedIn) {
      toast.error('Sign in to save parks to your account.');
      return;
    }

    setIsSaving(true);

    try {
      const savedPreference = await updateParkPreference(parkSlug, {
        isFavorite: nextPreference.isFavorite,
        wantsToGo: nextPreference.wantsToGo,
      });

      setPreference(savedPreference);
      notifyParkPreferencesChanged();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to update your park preferences.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-[1.5rem] border border-white/20 bg-white/10 p-4 backdrop-blur-md sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/68">
            Your Account
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
            Save {parkName} to your lists
          </h2>
        </div>
        <p className="max-w-sm text-sm leading-6 text-white/76 sm:text-right">
          Keep separate lists for parks you loved and parks you still want to visit.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <ParkFavoriteButton
          parkSlug={parkSlug}
          parkName={parkName}
          showLabel
          className="rounded-full border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70"
          activeClassName="border-rose-200 bg-rose-500 text-white"
          inactiveClassName="border-white/25 bg-white/12 text-white hover:bg-white/18"
        />
        <button
          type="button"
          disabled={isLoading || isSaving}
          onClick={() =>
            savePreference({
              ...preference,
              wantsToGo: !preference.wantsToGo,
            })
          }
          className={`rounded-full border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${
            preference.wantsToGo
              ? 'border-sky-200 bg-sky-500 text-white'
              : 'border-white/25 bg-white/12 text-white hover:bg-white/18'
          }`}
        >
          {preference.wantsToGo ? 'On your want-to-go list' : 'Want to go'}
        </button>
      </div>

      <p className="mt-3 text-sm text-white/72">
        {isLoading
          ? 'Loading your saved park status...'
          : isSignedIn
            ? 'These lists are stored per account and only affect your profile.'
            : 'Sign in to save this park to your personal lists.'}
      </p>
    </section>
  );
}
