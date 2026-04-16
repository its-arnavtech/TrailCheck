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
import SavedParksPanel from '@/components/saved-parks-panel';

type AuthPanelProps = {
  compact?: boolean;
};

const allowedEmailDomains = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.uk',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
]);

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthPanel({ compact = false }: AuthPanelProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('OTHER');
  const [age, setAge] = useState('');
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

  function hasAllowedEmailDomain(value: string) {
    const domain = value.trim().toLowerCase().split('@')[1] ?? '';
    return allowedEmailDomains.has(domain);
  }

  function hasValidEmail(value: string) {
    const normalized = value.trim().toLowerCase();
    return emailPattern.test(normalized) && hasAllowedEmailDomain(normalized);
  }

  const emailIsInvalid = mode === 'signup' && email.length > 0 && !hasValidEmail(email);
  const passwordTooShort = mode === 'signup' && password.length > 0 && password.length < 8;
  const ageIsInvalid =
    mode === 'signup' &&
    age.length > 0 &&
    (!/^\d+$/.test(age) || Number(age) < 1 || Number(age) > 120);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (mode === 'signup' && !hasValidEmail(email)) {
      toast.error('Please use a supported email provider such as Gmail, Yahoo, Outlook, iCloud, AOL, or Proton.');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    if (mode === 'signup' && ageIsInvalid) {
      toast.error('Age must be a whole number between 1 and 120.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response =
        mode === 'signup'
          ? await signup({ email, password, gender, age: Number(age) })
          : await signin({ email, password });

      setStoredSession(response.access_token, response.user);
      setUser(response.user);
      setPassword('');
      setConfirmPassword('');
      setAge('');
      setGender('OTHER');
      toast.success(
        mode === 'signup'
          ? 'Account created. You are now signed in.'
          : 'Signed in successfully.',
      );
    } catch (error) {
      const rawMessage =
        error instanceof Error ? error.message : 'Authentication failed.';
      const message =
        mode === 'signup' &&
        rawMessage.toLowerCase().includes('already exists')
          ? 'This user already exists'
          : rawMessage;
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSignOut() {
    clearStoredSession();
    setUser(null);
    setPassword('');
    setConfirmPassword('');
    setAge('');
    setGender('OTHER');
    toast.success('Signed out.');
  }

  if (isLoadingUser) {
    return (
      <div className={`${compact ? 'py-1 text-[var(--foreground)]/72' : 'rounded-[1.75rem] border border-white/35 bg-white/20 p-5 text-sm text-white/88 backdrop-blur-xl'}`}>
        Checking sign-in status...
      </div>
    );
  }

  if (user) {
    return (
      <div
        className={`${
          compact
            ? 'text-[var(--foreground)]'
            : 'rounded-[1.75rem] border border-white/35 bg-transparent p-5 text-white shadow-[var(--shadow-soft)] backdrop-blur-xl'
        } ${compact ? 'py-1' : ''}`}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
          Signed In
        </p>
        <h3 className="mt-2 text-xl font-semibold tracking-tight">
          {user.email}
        </h3>
        <p className="mt-2 text-sm opacity-80">
          You can submit protected trail reports and save parks to favorites or want-to-go lists with this account.
        </p>
        <button
          type="button"
          onClick={handleSignOut}
          className={`mt-4 flex w-full items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold transition ${
            compact
              ? 'bg-[var(--accent-strong)] text-white hover:brightness-110'
              : 'bg-white text-emerald-950 hover:bg-white/90'
          }`}
        >
          Sign out
        </button>
        <SavedParksPanel />
      </div>
    );
  }

  return (
    <div
      className={`${
        compact
          ? 'text-[var(--foreground)]'
          : 'rounded-[1.75rem] border border-white/35 bg-transparent p-5 text-white shadow-[var(--shadow-soft)] backdrop-blur-xl'
      } ${compact ? 'py-1' : ''}`}
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
        {mode === 'signup' ? (
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
              compact
                ? 'border-[var(--border)] bg-white/80 text-[var(--ink-on-light)] placeholder:text-[var(--ink-on-light-muted)] focus:border-[var(--accent)] focus:ring-4 focus:ring-emerald-100'
                : 'border-white/35 bg-white/92 text-slate-900 focus:border-white focus:ring-4 focus:ring-white/30'
            }`}
            minLength={8}
            required
          />
        ) : null}
        {mode === 'signup' ? (
          <select
            value={gender}
            onChange={(event) => setGender(event.target.value as 'MALE' | 'FEMALE' | 'OTHER')}
            className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
              compact
                ? 'border-[var(--border)] bg-white/80 text-[var(--ink-on-light)] focus:border-[var(--accent)] focus:ring-4 focus:ring-emerald-100'
                : 'border-white/35 bg-white/92 text-slate-900 focus:border-white focus:ring-4 focus:ring-white/30'
            }`}
            required
          >
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        ) : null}
        {mode === 'signup' ? (
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Age"
            value={age}
            onChange={(event) => {
              const nextValue = event.target.value.replace(/\D/g, '');
              setAge(nextValue);
            }}
            className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
              compact
                ? 'border-[var(--border)] bg-white/80 text-[var(--ink-on-light)] placeholder:text-[var(--ink-on-light-muted)] focus:border-[var(--accent)] focus:ring-4 focus:ring-emerald-100'
                : 'border-white/35 bg-white/92 text-slate-900 focus:border-white focus:ring-4 focus:ring-white/30'
            }`}
            required
          />
        ) : null}
        <button
          type="submit"
          disabled={
            isSubmitting ||
            (mode === 'signup' &&
              ((confirmPassword.length > 0 && password !== confirmPassword) ||
                emailIsInvalid ||
                passwordTooShort ||
                ageIsInvalid ||
                age.length === 0))
          }
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
        {mode === 'signup' ? (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              compact
                ? 'border-[var(--border)] bg-white/72 text-[var(--ink-on-light)]'
                : 'border-white/20 bg-white/12 text-white'
            }`}
          >
            <ul className="list-disc space-y-1 pl-5">
              <li>Email must be valid.</li>
              <li>Password should be more than 8 characters.</li>
            </ul>
            {emailIsInvalid || passwordTooShort ? (
              <div className="mt-3 space-y-1 font-medium text-rose-300">
                {emailIsInvalid ? (
                  <p>Email is not valid. Use a supported provider such as Gmail, Yahoo, Outlook, iCloud, AOL, or Proton.</p>
                ) : null}
                {passwordTooShort ? (
                  <p>Password must be at least 8 characters long.</p>
                ) : null}
                {ageIsInvalid ? (
                  <p>Age must be a whole number between 1 and 120.</p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </form>
    </div>
  );
}
