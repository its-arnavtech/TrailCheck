'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import AuthPageShell from '@/components/auth-page-shell';
import { resetPassword } from '@/lib/api';
import {
  PASSWORD_POLICY_HINT,
  passwordMeetsPolicy,
} from '@/lib/password-policy';

const RESET_TOKEN_PATTERN = /^[a-f0-9]{64}$/i;

type ResetPasswordFormProps = {
  token: string;
};

export default function ResetPasswordForm({
  token: initialToken,
}: ResetPasswordFormProps) {
  const token = initialToken.trim();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const tokenIsInvalid = token.length === 0 || !RESET_TOKEN_PATTERN.test(token);
  const passwordIsWeak = password.length > 0 && !passwordMeetsPolicy(password);
  const passwordsMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (tokenIsInvalid) {
      toast.error('This password reset link is invalid or has expired.');
      return;
    }

    if (!passwordMeetsPolicy(password)) {
      toast.error(PASSWORD_POLICY_HINT);
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword({ token, password });
      setIsSubmitted(true);
      toast.success('Password updated. You can sign in now.');
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Unable to reset your password.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthPageShell
      eyebrow="Password Reset"
      title="Create a new password"
      description="Choose a strong new password for your TrailCheck account. This reset link can only be used once."
    >
      {isSubmitted ? (
        <div className="space-y-4">
          <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-4 text-sm text-[var(--foreground)]/82">
            Your password has been reset successfully.
          </div>
          <Link
            href="/"
            className="inline-flex rounded-full bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Return to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {tokenIsInvalid ? (
            <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
              This password reset link is invalid or has expired.
            </div>
          ) : null}
          <input
            type="password"
            autoComplete="new-password"
            placeholder="New password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--ink-on-light)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
            minLength={12}
            maxLength={128}
            required
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--ink-on-light)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
            minLength={12}
            maxLength={128}
            required
          />
          <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-4 text-sm text-[var(--foreground)]/78">
            <p>{PASSWORD_POLICY_HINT}</p>
            {passwordIsWeak || passwordsMismatch ? (
              <div className="mt-3 space-y-1 font-medium text-rose-600">
                {passwordIsWeak ? <p>{PASSWORD_POLICY_HINT}</p> : null}
                {passwordsMismatch ? <p>Passwords do not match.</p> : null}
              </div>
            ) : null}
          </div>
          <button
            type="submit"
            disabled={
              isSubmitting ||
              tokenIsInvalid ||
              !passwordMeetsPolicy(password) ||
              password !== confirmPassword
            }
            className="w-full rounded-2xl bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Resetting password...' : 'Reset password'}
          </button>
          <p className="text-sm text-[var(--foreground)]/62">
            Need a fresh link?{' '}
            <Link
              href="/auth/forgot-password"
              className="font-medium text-[var(--accent-strong)] underline underline-offset-4"
            >
              Request another reset email
            </Link>
          </p>
        </form>
      )}
    </AuthPageShell>
  );
}
