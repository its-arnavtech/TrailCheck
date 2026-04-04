'use client';

import { FormEvent, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getCurrentUser, signin, signup, type AuthenticatedUser } from '@/lib/api';
import {
  AUTH_STATE_CHANGED_EVENT,
  clearStoredSession,
  getStoredAuthToken,
  getStoredAuthUser,
  setStoredSession,
} from '@/lib/auth';

type AuthPanelProps = {
  compact?: boolean;
};

export default function AuthPanel({ compact = false }: AuthPanelProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);

  useEffect(() => {
    async function syncAuthState() {
      const token = getStoredAuthToken();
      const storedUser = getStoredAuthUser();

      if (!token) {
        setUser(null);
        setIsLoadingUser(false);
        return;
      }

      if (storedUser) {
        setUser(storedUser);
        setIsLoadingUser(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser(token);
        setStoredSession(token, currentUser);
        setUser(currentUser);
      } catch {
        clearStoredSession();
        setUser(null);
      } finally {
        setIsLoadingUser(false);
      }
    }

    syncAuthState();

    function handleAuthChange() {
      setUser(getStoredAuthUser());
      setIsLoadingUser(false);
    }

    window.addEventListener(AUTH_STATE_CHANGED_EVENT, handleAuthChange);
    return () =>
      window.removeEventListener(AUTH_STATE_CHANGED_EVENT, handleAuthChange);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response =
        mode === 'signup'
          ? await signup({ email, password })
          : await signin({ email, password });

      setStoredSession(response.access_token, response.user);
      setUser(response.user);
      setPassword('');
      toast.success(
        mode === 'signup'
          ? 'Account created. You are now signed in.'
          : 'Signed in successfully.',
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Authentication failed.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSignOut() {
    clearStoredSession();
    setUser(null);
    setPassword('');
    toast.success('Signed out.');
  }

  if (isLoadingUser) {
    return (
      <div className="rounded-[1.75rem] border border-white/35 bg-white/20 p-5 text-sm text-white/88 backdrop-blur-xl">
        Checking sign-in status...
      </div>
    );
  }

  if (user) {
    return (
      <div
        className={`rounded-[1.75rem] border ${
          compact ? 'border-[var(--border)] bg-transparent text-[var(--foreground)]' : 'border-white/35 bg-transparent text-white'
        } p-5 shadow-[var(--shadow-soft)] backdrop-blur-xl`}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
          Signed In
        </p>
        <h3 className="mt-2 text-xl font-semibold tracking-tight">
          {user.email}
        </h3>
        <p className="mt-2 text-sm opacity-80">
          You can submit protected trail reports with this account.
        </p>
        <button
          type="button"
          onClick={handleSignOut}
          className={`mt-4 inline-flex rounded-2xl px-4 py-2 text-sm font-semibold transition ${
            compact
              ? 'bg-[var(--accent-strong)] text-white hover:brightness-110'
              : 'bg-white text-emerald-950 hover:bg-white/90'
          }`}
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div
      className={`rounded-[1.75rem] border ${
        compact ? 'border-[var(--border)] bg-transparent text-[var(--foreground)]' : 'border-white/35 bg-transparent text-white'
      } p-5 shadow-[var(--shadow-soft)] backdrop-blur-xl`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
            Account
          </p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight">
            {compact ? 'Sign in to report' : 'Join the TrailCheck network'}
          </h3>
        </div>
        <div className="flex rounded-full border border-current/15 p-1 text-xs">
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={`rounded-full px-3 py-1 font-semibold transition ${
              mode === 'signin'
                ? compact
                  ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]'
                  : 'bg-white text-emerald-950'
                : 'opacity-70'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`rounded-full px-3 py-1 font-semibold transition ${
              mode === 'signup'
                ? compact
                  ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]'
                  : 'bg-white text-emerald-950'
                : 'opacity-70'
            }`}
          >
            Sign up
          </button>
        </div>
      </div>

      <p className="mt-3 text-sm opacity-80">
        {mode === 'signup'
          ? 'Create an account to keep report submissions authenticated.'
          : 'Use your account to access protected reporting routes.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <input
          type="email"
          autoComplete="email"
          placeholder="Email address"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
            compact
              ? 'border-[var(--border)] bg-white/80 text-[var(--ink-on-light)] placeholder:text-[var(--ink-on-light-muted)] focus:border-[var(--accent)] focus:ring-4 focus:ring-emerald-100'
              : 'border-white/35 bg-white/92 text-slate-900 focus:border-white focus:ring-4 focus:ring-white/30'
          }`}
          required
        />
        <input
          type="password"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
            compact
              ? 'border-[var(--border)] bg-white/80 text-[var(--ink-on-light)] placeholder:text-[var(--ink-on-light-muted)] focus:border-[var(--accent)] focus:ring-4 focus:ring-emerald-100'
              : 'border-white/35 bg-white/92 text-slate-900 focus:border-white focus:ring-4 focus:ring-white/30'
          }`}
          minLength={8}
          required
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
            compact
              ? 'bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] text-white hover:brightness-105'
              : 'bg-emerald-950 text-white hover:bg-emerald-900'
          }`}
        >
          {isSubmitting
            ? mode === 'signup'
              ? 'Creating account...'
              : 'Signing in...'
            : mode === 'signup'
              ? 'Create account'
              : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
