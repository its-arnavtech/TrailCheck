import type { AuthenticatedUser } from './api';

export const AUTH_TOKEN_KEY = 'trailcheck.auth.token';
export const AUTH_USER_KEY = 'trailcheck.auth.user';
export const AUTH_STATE_CHANGED_EVENT = 'trailcheck-auth-changed';

function isBrowser() {
  return typeof window !== 'undefined';
}

export function getStoredAuthToken() {
  if (!isBrowser()) {
    return null;
  }

  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getStoredAuthUser(): AuthenticatedUser | null {
  if (!isBrowser()) {
    return null;
  }

  const rawUser = window.localStorage.getItem(AUTH_USER_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as AuthenticatedUser;
  } catch {
    return null;
  }
}

export function setStoredSession(token: string, user: AuthenticatedUser) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(AUTH_STATE_CHANGED_EVENT));
}

export function clearStoredSession() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
  window.dispatchEvent(new Event(AUTH_STATE_CHANGED_EVENT));
}
