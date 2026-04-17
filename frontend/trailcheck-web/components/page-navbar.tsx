import Link from 'next/link';

type PageNavbarProps = {
  parkHref?: string;
  parkLabel?: string;
  trailHref?: string;
  trailLabel?: string;
};

export default function PageNavbar({
  parkHref,
  parkLabel,
  trailHref,
  trailLabel,
}: PageNavbarProps) {
  return (
    <nav className="sticky top-4 z-30 flex flex-wrap items-center gap-3 rounded-full border border-[var(--border)] bg-[color:color-mix(in_srgb,var(--surface)_86%,white_14%)] px-3 py-3 shadow-[var(--shadow-soft)] backdrop-blur-xl sm:px-4">
      <Link
        href="/"
        className="rounded-full bg-[var(--accent-strong)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
      >
        Home
      </Link>
      {parkHref && parkLabel ? (
        <Link
          href={parkHref}
          className="rounded-full border border-[var(--border)] bg-white/65 px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-white/85"
        >
          {parkLabel}
        </Link>
      ) : null}
      {trailHref && trailLabel ? (
        <Link
          href={trailHref}
          className="rounded-full border border-[var(--border)] bg-white/65 px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-white/85"
        >
          {trailLabel}
        </Link>
      ) : null}
    </nav>
  );
}
