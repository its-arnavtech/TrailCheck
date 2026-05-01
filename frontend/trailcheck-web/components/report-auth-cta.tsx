'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import ModalShell from '@/components/modal-shell';
import { useAuthSession } from '@/lib/use-auth-session';

const AuthPanel = dynamic(() => import('@/components/auth-panel'));

export default function ReportAuthCta() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const { isLoading: isAuthLoading, user } = useAuthSession();
  const signedInEmail = user?.email ?? null;

  if (isAuthLoading) {
    return (
      <div className="rounded-[1.35rem] border border-white/10 bg-white/6 px-4 py-4 text-sm text-white/70">
        Checking your session...
      </div>
    );
  }

  if (signedInEmail) {
    return (
      <div className="rounded-[1.35rem] border border-emerald-300/16 bg-emerald-400/10 px-4 py-4 text-sm text-emerald-50">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200/70">
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
        className="inline-flex min-h-11 items-center rounded-full bg-[linear-gradient(135deg,#6d8f80,#c8ddcf)] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110"
      >
        Login to report
      </button>

      {isAuthOpen ? (
        <ModalShell onClose={() => setIsAuthOpen(false)}>
          <AuthPanel />
        </ModalShell>
      ) : null}
    </>
  );
}
