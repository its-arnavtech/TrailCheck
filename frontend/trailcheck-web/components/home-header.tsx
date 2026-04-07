'use client';

import { useEffect, useState } from 'react';
import AuthPanel from '@/components/auth-panel';
import FavoritesPanel from '@/components/favorites-panel';
import {
  AUTH_STATE_CHANGED_EVENT,
  getStoredAuthToken,
  getStoredAuthUser,
} from '@/lib/auth';

export default function HomeHeader() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    function syncAuthState() {
      const token = getStoredAuthToken();
      const user = getStoredAuthUser();
      setIsSignedIn(Boolean(token && user));
    }

    syncAuthState();
    window.addEventListener(AUTH_STATE_CHANGED_EVENT, syncAuthState);
    return () => window.removeEventListener(AUTH_STATE_CHANGED_EVENT, syncAuthState);
  }, []);

  function handleAuthAction() {
    setIsAuthOpen(true);
  }

  return (
    <>
      <header className="relative z-20 w-full border-b border-white/14 bg-[rgba(12,19,27,0.48)] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[min(100%,1440px)] items-center justify-center px-4 py-4 sm:px-6 lg:px-8 xl:px-10">
          <nav className="flex items-center gap-6 sm:gap-8">
            <a
              href="#explore-parks"
              className="text-sm font-medium text-white underline underline-offset-4 transition hover:text-white/80 sm:text-base"
            >
              Discover
            </a>
            <a
              href="https://www.nps.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-white underline underline-offset-4 transition hover:text-white/80 sm:text-base"
            >
              Visit NPS
            </a>
            {isSignedIn ? (
              <button
                type="button"
                onClick={() => setIsFavoritesOpen(true)}
                className="text-sm font-medium text-white underline underline-offset-4 transition hover:text-white/80 sm:text-base"
              >
                Favorites
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleAuthAction}
              className="text-sm font-semibold text-white underline underline-offset-4 transition hover:text-white/80 sm:text-base"
            >
              {isSignedIn ? 'Account' : 'Login / Sign up'}
            </button>
          </nav>
        </div>
      </header>

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

      {isFavoritesOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={() => setIsFavoritesOpen(false)}
        >
          <div
            className="relative w-full max-w-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <FavoritesPanel />
          </div>
        </div>
      ) : null}
    </>
  );
}
