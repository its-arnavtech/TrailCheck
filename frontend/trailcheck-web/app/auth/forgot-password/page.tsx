'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import AuthPageShell from '@/components/auth-page-shell';
import { requestPasswordReset } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await requestPasswordReset({ email });
      setIsSubmitted(true);
      toast.success('If an account exists, a reset link is on its way.');
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Unable to submit reset request.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthPageShell
      eyebrow="Password Reset"
      title="Forgot your password?"
      description="Enter the email address tied to your TrailCheck account. We’ll send a reset link if the account exists."
    >
      {isSubmitted ? (
        <div className="space-y-4">
          <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-4 text-sm text-[var(--foreground)]/82">
            If an account with that email exists, we&apos;ve sent a password
            reset link.
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
          <input
            type="email"
            autoComplete="email"
            placeholder="Email address"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--ink-on-light)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
            required
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Sending reset link...' : 'Send reset link'}
          </button>
          <p className="text-sm text-[var(--foreground)]/62">
            Remembered it?{' '}
            <Link
              href="/"
              className="font-medium text-[var(--accent-strong)] underline underline-offset-4"
            >
              Go back to sign in
            </Link>
          </p>
        </form>
      )}
    </AuthPageShell>
  );
}
