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
      <div className="rounded-[1.35rem] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
          Signed in
        </p>
        <p className="mt-2 font-medium">{signedInEmail}</p>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsAuthOpen(true)}
        className="inline-flex min-h-11 items-center rounded-full bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
      >
        Login to report
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
