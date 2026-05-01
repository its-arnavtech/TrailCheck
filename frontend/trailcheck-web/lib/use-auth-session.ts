'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser, type AuthenticatedUser } from './api';
import {
  AUTH_STATE_CHANGED_EVENT,
  clearStoredSession,
  getStoredAuthToken,
  setStoredSession,
} from './auth';

type AuthSessionState = {
  isLoading: boolean;
  token: string | null;
  user: AuthenticatedUser | null;
};

let cachedToken: string | null = null;
let cachedUser: AuthenticatedUser | null = null;
let inFlightSession: Promise<AuthSessionState> | null = null;

export function resetAuthSessionCache() {
  cachedToken = null;
  cachedUser = null;
  inFlightSession = null;
}

async function resolveAuthSession(): Promise<AuthSessionState> {
  const token = getStoredAuthToken();

  if (!token) {
    resetAuthSessionCache();
    return { isLoading: false, token: null, user: null };
  }

  if (cachedToken === token && cachedUser) {
    return { isLoading: false, token, user: cachedUser };
  }

  if (inFlightSession) {
    return inFlightSession;
  }

  inFlightSession = getCurrentUser(token)
    .then((user) => {
      cachedToken = token;
      cachedUser = user;
      setStoredSession(token, user);
      return { isLoading: false, token, user };
    })
    .catch(() => {
      clearStoredSession();
      return { isLoading: false, token: null, user: null };
    })
    .finally(() => {
      inFlightSession = null;
    });

  return inFlightSession;
}

export function useAuthSession(): AuthSessionState {
  const [session, setSession] = useState<AuthSessionState>({
    isLoading: true,
    token: null,
    user: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function syncSession() {
      const nextSession = await resolveAuthSession();
      if (!cancelled) {
        setSession(nextSession);
      }
    }

    syncSession();
    window.addEventListener(AUTH_STATE_CHANGED_EVENT, syncSession);

    return () => {
      cancelled = true;
      window.removeEventListener(AUTH_STATE_CHANGED_EVENT, syncSession);
    };
  }, []);

  return session;
}
