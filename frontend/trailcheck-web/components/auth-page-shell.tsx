import Link from 'next/link';
import { ReactNode } from 'react';

type AuthPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export default function AuthPageShell({
  eyebrow,
  title,
  description,
  children,
}: AuthPageShellProps) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-lg rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-xl sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]/80">
              {eyebrow}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
              {title}
            </h1>
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-[var(--accent-strong)] underline underline-offset-4 transition hover:opacity-80"
          >
            Back home
          </Link>
        </div>

        <p className="mt-3 text-sm text-[var(--foreground)]/72">{description}</p>

        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
