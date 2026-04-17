'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  AUTH_STATE_CHANGED_EVENT,
  getStoredAuthToken,
  getStoredAuthUser,
} from '@/lib/auth';

const AuthPanel = dynamic(() => import('@/components/auth-panel'));

type PageNavbarProps = {
  parkHref?: string;
  parkLabel?: string;
  trailHref?: string;
  trailLabel?: string;
};

type NavCrumb = {
  href?: string;
  label: string;
  current?: boolean;
};

function NavCrumbItem({ href, label, current = false }: NavCrumb) {
  const className =
    'inline-flex min-h-11 items-center px-1 py-2 text-sm font-semibold transition ' +
    (current
      ? 'text-white'
      : 'text-white/72 hover:text-white');

  if (href && !current) {
    return (
      <Link href={href} className={className}>
        {label}
      </Link>
    );
  }

  return (
    <span aria-current={current ? 'page' : undefined} className={className}>
      {label}
    </span>
  );
}

export default function PageNavbar({
  parkHref,
  parkLabel,
  trailHref,
  trailLabel,
}: PageNavbarProps) {
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

  const crumbs: NavCrumb[] = [{ href: '/', label: 'Home', current: !parkLabel && !trailLabel }];

  if (parkLabel) {
    crumbs.push({
      href: trailLabel ? parkHref : undefined,
      label: parkLabel,
      current: !trailLabel,
    });
  }

  if (trailLabel) {
    crumbs.push({
      href: trailHref,
      label: trailLabel,
      current: true,
    });
  }

  return (
    <>
      <nav className="sticky top-4 z-30 rounded-[1.9rem] border border-white/10 bg-[color:color-mix(in_srgb,var(--surface-strong)_86%,black_14%)] px-4 py-3 shadow-[var(--shadow-soft)] backdrop-blur-xl sm:px-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:gap-x-4">
          {crumbs.map((crumb, index) => (
            <div key={`${crumb.label}-${crumb.href ?? 'current'}`} className="flex items-center gap-3 sm:gap-4">
              {index > 0 ? (
                <span className="text-sm font-semibold text-white/28" aria-hidden="true">
                  /
                </span>
              ) : null}
              <NavCrumbItem href={crumb.href} label={crumb.label} current={crumb.current} />
            </div>
          ))}

          <div className="ml-auto" />

          {!signedInEmail ? (
            <button
              type="button"
              onClick={() => setIsAuthOpen(true)}
              className="inline-flex min-h-11 items-center rounded-full bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] px-5 py-2 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Login
            </button>
          ) : (
            <span className="inline-flex min-h-11 items-center rounded-full border border-emerald-200/45 bg-emerald-100/12 px-4 py-2 text-sm font-medium text-emerald-50">
              {signedInEmail}
            </span>
          )}
        </div>
      </nav>

      {isAuthOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={() => setIsAuthOpen(false)}
        >
          <div className="relative w-full max-w-md" onClick={(event) => event.stopPropagation()}>
            <AuthPanel />
          </div>
        </div>
      ) : null}
    </>
  );
}
