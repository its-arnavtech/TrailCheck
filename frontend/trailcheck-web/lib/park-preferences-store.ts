import { getMyParkPreferences, type ParkPreference } from './api';

const AUTH_TOKEN_KEY = 'trailcheck.auth.token';
const AUTH_STATE_CHANGED_EVENT = 'trailcheck-auth-changed';
const PARK_PREFERENCES_CHANGED_EVENT = 'trailcheck-park-preferences-changed';

let cachedToken: string | null = null;
let cachedPreferences: ParkPreference[] | null = null;
let inFlightPreferencesPromise: Promise<ParkPreference[]> | null = null;
let listenersBound = false;

export function resetParkPreferencesCache() {
  cachedToken = null;
  cachedPreferences = null;
  inFlightPreferencesPromise = null;
}

function bindResetListeners() {
  if (listenersBound || typeof window === 'undefined') {
    return;
  }

  const reset = () => resetParkPreferencesCache();
  window.addEventListener(AUTH_STATE_CHANGED_EVENT, reset);
  window.addEventListener(PARK_PREFERENCES_CHANGED_EVENT, reset);
  listenersBound = true;
}

export async function getCachedParkPreferences(): Promise<ParkPreference[]> {
  bindResetListeners();

  const token =
    typeof window === 'undefined'
      ? null
      : window.localStorage.getItem(AUTH_TOKEN_KEY);

  if (!token) {
    resetParkPreferencesCache();
    return [];
  }

  if (cachedToken !== token) {
    cachedToken = token;
    cachedPreferences = null;
    inFlightPreferencesPromise = null;
  }

  if (cachedPreferences) {
    return cachedPreferences;
  }

  if (inFlightPreferencesPromise) {
    return inFlightPreferencesPromise;
  }

  inFlightPreferencesPromise = getMyParkPreferences()
    .then((preferences) => {
      cachedPreferences = preferences;
      return preferences;
    })
    .finally(() => {
      inFlightPreferencesPromise = null;
    });

  return inFlightPreferencesPromise;
}
