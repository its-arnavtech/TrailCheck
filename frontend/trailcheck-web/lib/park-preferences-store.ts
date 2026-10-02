import { getMyParkPreferences, type ParkPreference } from "./api";

const AUTH_TOKEN_KEY = "trailcheck.auth.token";
const AUTH_STATE_CHANGED_EVENT = "trailcheck-auth-changed";
const PARK_PREFERENCES_CHANGED_EVENT = "trailcheck-park-preferences-changed";

let cachedToken: string | null = null;
let cachedPreferences: ParkPreference[] | null = null;
let inFlightPreferencesPromise: Promise<ParkPreference[]> | null = null;
let listenersBound = false;
let generation = 0;

export function resetParkPreferencesCache() {
  generation += 1;
  cachedToken = null;
  cachedPreferences = null;
  inFlightPreferencesPromise = null;
}

function bindResetListeners() {
  if (listenersBound || typeof window === "undefined") {
    return;
  }

  const reset = () => resetParkPreferencesCache();
  window.addEventListener(AUTH_STATE_CHANGED_EVENT, reset);
  window.addEventListener(PARK_PREFERENCES_CHANGED_EVENT, reset);
  window.addEventListener("storage", (event: StorageEvent) => {
    if (event.key === null || event.key === AUTH_TOKEN_KEY) reset();
  });
  listenersBound = true;
}

export async function getCachedParkPreferences(): Promise<ParkPreference[]> {
  bindResetListeners();

  const token =
    typeof window === "undefined"
      ? null
      : window.localStorage.getItem(AUTH_TOKEN_KEY);

  if (!token) {
    resetParkPreferencesCache();
    return [];
  }

  if (cachedToken !== token) {
    generation += 1;
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

  const requestGeneration = generation;
  const request = getMyParkPreferences()
    .then((preferences) => {
      if (
        requestGeneration !== generation ||
        window.localStorage.getItem(AUTH_TOKEN_KEY) !== token
      ) {
        return [];
      }
      cachedPreferences = preferences;
      return preferences;
    })
    .finally(() => {
      if (inFlightPreferencesPromise === request)
        inFlightPreferencesPromise = null;
    });
  inFlightPreferencesPromise = request;
  return request;
}
