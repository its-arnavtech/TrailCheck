import Link from 'next/link';
import { notFound } from 'next/navigation';
import ParkTrailsExplorer from '@/components/park-trails-explorer';
import { getPark } from '@/lib/api';
import { getParkVisual } from '@/lib/park-content';

type ParkPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ParkPage({ params }: ParkPageProps) {
  const { slug } = await params;
  const park = await getPark(slug);

  if (!park) notFound();
  const visual = await getParkVisual(park.slug, park.name);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[min(100%,1440px)] flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-[var(--border)] shadow-[var(--shadow-soft)]">
        <img
          src={visual.imageUrl}
          alt={visual.imageAlt}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(22,29,38,0.88),rgba(51,67,84,0.46),rgba(255,255,255,0.05))]" />
        <div className="relative p-6 sm:p-8">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-white/72">
            {visual.eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {park.name}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/82 sm:text-base">
            {visual.tagline}{' '}
            {park.trails.length > 0
              ? 'Pick a trail to view its latest reports, hazards, weather, and park alerts.'
              : 'Trail detail pages are coming soon for this park.'}
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm text-white">
            <div className="rounded-full border border-white/30 bg-white/14 px-4 py-2 backdrop-blur">
              {park.trails.length} trail{park.trails.length === 1 ? '' : 's'} in this park
            </div>
            <Link
              href="/"
              className="rounded-full border border-white/30 bg-white/14 px-4 py-2 backdrop-blur transition hover:bg-white/22"
            >
              Back to parks
            </Link>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--accent-strong)]/75">
            Trails
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
            Available routes
          </h2>
        </div>

        <ParkTrailsExplorer trails={park.trails} />
      </section>
    </main>
  );
}
