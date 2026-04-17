'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import {
  AUTH_STATE_CHANGED_EVENT,
  getStoredAuthToken,
  getStoredAuthUser,
} from '@/lib/auth';

const AuthPanel = dynamic(() => import('@/components/auth-panel'));

export default function ReportAuthCta() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);

  useEffect(() => {
    function syncAuthState() {
      const token = getStoredAuthToken();
      const user = getStoredAuthUser();
      setSignedInEmail(token ? user?.email ?? null : null);
    }

    syncAuthState();
    window.addEventListener(AUTH_STATE_CHANGED_EVENT, syncAuthState);
    return () => window.removeEventListener(AUTH_STATE_CHANGED_EVENT, syncAuthState);
  }, []);

  if (signedInEmail) {
    return (
      <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800">
        Signed in as {signedInEmail}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsAuthOpen(true)}
        className="inline-flex rounded-full border border-[var(--border)] bg-white/78 px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-white"
      >
        Not Signed in? Click here
      </button>

      {isAuthOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={() => setIsAuthOpen(false)}
        >
          <div
            className="relative w-full max-w-md"
            onClick={(event) => event.stopPropagation()}
          >
            <AuthPanel />
          </div>
        </div>
      ) : null}
    </>
  );
}
