'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { updateParkPreference } from '@/lib/api';
import {
  AUTH_STATE_CHANGED_EVENT,
  PARK_PREFERENCES_CHANGED_EVENT,
  getStoredAuthToken,
  notifyParkPreferencesChanged,
} from '@/lib/auth';
import { getCachedParkPreferences } from '@/lib/park-preferences-store';

type ParkFavoriteButtonProps = {
  parkSlug: string;
  parkName: string;
  showLabel?: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
  className?: string;
  activeClassName?: string;
  inactiveClassName?: string;
};

export default function ParkFavoriteButton({
  parkSlug,
  parkName,
  showLabel = false,
  activeLabel = 'Favorited',
  inactiveLabel = 'Add to favorites',
  className = '',
  activeClassName = '',
  inactiveClassName = '',
}: ParkFavoriteButtonProps) {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [wantsToGo, setWantsToGo] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function syncPreference() {
      const signedIn = Boolean(getStoredAuthToken());
      setIsSignedIn(signedIn);

      if (!signedIn) {
        setIsFavorite(false);
        setWantsToGo(false);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const preferences = await getCachedParkPreferences();
        const preference = preferences.find(
          (entry) => entry.parkSlug === parkSlug,
        );
        setIsFavorite(preference?.isFavorite ?? false);
        setWantsToGo(preference?.wantsToGo ?? false);
      } catch {
        setIsFavorite(false);
        setWantsToGo(false);
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
  }, [parkSlug]);

  async function handleToggleFavorite(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (!isSignedIn) {
      toast.error('Sign in to save parks to your favorites.');
      return;
    }

    setIsSaving(true);

    try {
      const nextFavorite = !isFavorite;
      await updateParkPreference(parkSlug, {
        isFavorite: nextFavorite,
        wantsToGo,
      });
      setIsFavorite(nextFavorite);
      notifyParkPreferencesChanged();
      toast.success(
        nextFavorite
          ? `${parkName} added to your favorites.`
          : `${parkName} removed from your favorites.`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to update favorites.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  const stateClassName = isFavorite ? activeClassName : inactiveClassName;

  return (
    <button
      type="button"
      aria-label={isFavorite ? `Remove ${parkName} from favorites` : `Add ${parkName} to favorites`}
      aria-pressed={isFavorite}
      title={isSignedIn ? (isFavorite ? 'Remove from favorites' : 'Add to favorites') : 'Sign in to save favorites'}
      disabled={isSaving || isLoading}
      onClick={handleToggleFavorite}
      className={`${className} ${stateClassName}`.trim()}
    >
      <span className="text-lg leading-none">{isFavorite ? '\u2665' : '\u2661'}</span>
      {showLabel ? (
        <span className="ml-2">{isFavorite ? activeLabel : inactiveLabel}</span>
      ) : null}
    </button>
  );
}
