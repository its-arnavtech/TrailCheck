'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import ModalShell from '@/components/modal-shell';
import {
  AUTH_STATE_CHANGED_EVENT,
  getStoredAuthToken,
  getStoredAuthUser,
} from '@/lib/auth';

const AuthPanel = dynamic(() => import('@/components/auth-panel'));
const FavoritesPanel = dynamic(() => import('@/components/favorites-panel'));

type NavBarProps = {
  parkHref?: string;
  parkLabel?: string;
  trailHref?: string;
  trailLabel?: string;
  home?: boolean;
};

type NavCrumb = {
  href?: string;
  label: string;
  current?: boolean;
};

function NavCrumbItem({ href, label, current = false }: NavCrumb) {
  const className =
    'inline-flex min-h-11 items-center px-1 py-2 text-sm font-semibold transition ' +
    (current ? 'text-white' : 'text-white/66 hover:text-white');

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

export default function NavBar({
  parkHref,
  parkLabel,
  trailHref,
  trailLabel,
  home = false,
}: NavBarProps) {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
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
      <header className={`${home ? 'section-shell pt-4 sm:pt-5' : ''}`}>
        <nav className="glass-panel topo-ring sticky top-4 z-30 rounded-[1.9rem] px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link href="/" className="mr-2 text-sm font-semibold uppercase tracking-[0.3em] text-[var(--accent-strong)]">
              TrailCheck
            </Link>

            {home ? (
              <>
                <a href="#explore-parks" className="text-sm font-medium text-white/72 transition hover:text-white">
                  Parks
                </a>
                <a href="#safety-digest" className="text-sm font-medium text-white/72 transition hover:text-white">
                  Safety Digest
                </a>
                <a href="#featured-parks" className="text-sm font-medium text-white/72 transition hover:text-white">
                  Featured
                </a>
              </>
            ) : (
              crumbs.map((crumb, index) => (
                <div key={`${crumb.label}-${crumb.href ?? 'current'}`} className="flex items-center gap-3">
                  {index > 0 ? (
                    <span className="text-sm font-semibold text-white/24" aria-hidden="true">
                      /
                    </span>
                  ) : null}
                  <NavCrumbItem href={crumb.href} label={crumb.label} current={crumb.current} />
                </div>
              ))
            )}

            <div className="ml-auto flex flex-wrap items-center gap-2">
              {signedInEmail ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsFavoritesOpen(true)}
                    className="inline-flex min-h-11 items-center rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
                  >
                    Saved parks
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAuthOpen(true)}
                    className="inline-flex min-h-11 items-center rounded-full border border-emerald-300/18 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100"
                  >
                    {signedInEmail}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAuthOpen(true)}
                  className="inline-flex min-h-11 items-center rounded-full bg-[linear-gradient(135deg,#6d8f80,#c8ddcf)] px-5 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-105"
                >
                  Login / Sign up
                </button>
              )}
            </div>
          </div>
        </nav>
      </header>

      {isAuthOpen ? (
        <ModalShell onClose={() => setIsAuthOpen(false)}>
          <AuthPanel />
        </ModalShell>
      ) : null}

      {isFavoritesOpen ? (
        <ModalShell onClose={() => setIsFavoritesOpen(false)} widthClassName="max-w-lg">
          <FavoritesPanel />
        </ModalShell>
      ) : null}
    </>
  );
}
