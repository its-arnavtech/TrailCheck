"use client";
import { useEffect, useState } from "react";
import { AUTH_STATE_CHANGED_EVENT } from "./auth";
import {
  resolveAuthSession,
  type AuthSessionState,
} from "./auth-session-store";
export { resetAuthSessionCache } from "./auth-session-store";
export function useAuthSession(): AuthSessionState {
  const [session, setSession] = useState<AuthSessionState>({
    isLoading: true,
    token: null,
    user: null,
  });
  useEffect(() => {
    let cancelled = false;
    let version = 0;
    async function syncSession() {
      const requestVersion = ++version;
      const nextSession = await resolveAuthSession();
      if (!cancelled && requestVersion === version) setSession(nextSession);
    }
    syncSession();
    const storageChanged = (event: StorageEvent) => {
      if (event.key === null || event.key?.startsWith("trailcheck.auth."))
        syncSession();
    };
    window.addEventListener(AUTH_STATE_CHANGED_EVENT, syncSession);
    window.addEventListener("storage", storageChanged);
    return () => {
      cancelled = true;
      window.removeEventListener(AUTH_STATE_CHANGED_EVENT, syncSession);
      window.removeEventListener("storage", storageChanged);
    };
  }, []);
  return session;
}
