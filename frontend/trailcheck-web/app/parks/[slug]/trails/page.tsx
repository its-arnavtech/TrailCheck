import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageNavbar from '@/components/page-navbar';
import ParkTrailsExplorer from '@/components/park-trails-explorer';
import { getPark } from '@/lib/api';
import { getParkVisual } from '@/lib/park-content';

type ParkTrailsPageProps = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 300;

export default async function ParkTrailsPage({ params }: ParkTrailsPageProps) {
  const { slug } = await params;
  const park = await getPark(slug);

  if (!park) {
    notFound();
  }

  const visual = await getParkVisual(park.slug, park.name);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[min(100%,1440px)] flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
      <PageNavbar parkHref={`/parks/${park.slug}`} parkLabel={park.name} />

      <section className="relative overflow-hidden rounded-[2rem] border border-[var(--border)] shadow-[var(--shadow-soft)]">
        <img
          src={visual.imageUrl}
          alt={visual.imageAlt}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(247,250,252,0.88),rgba(232,239,246,0.82),rgba(18,24,32,0.18))]" />
        <div className="relative space-y-6 p-6 sm:p-8 lg:p-10">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-[var(--accent-strong)]/72">
              Trail Directory
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Explore every trail in {park.name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-800/80 sm:text-base">
              Browse routes with a calmer layout, scenic imagery, and direct links into live trail
              conditions.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-sm">
            <span className="rounded-full border border-slate-900/8 bg-white/72 px-4 py-2 font-medium text-slate-900">
              {park.trails.length} trail{park.trails.length === 1 ? '' : 's'}
            </span>
            <Link
              href={`/parks/${park.slug}`}
              className="rounded-full border border-slate-900/10 bg-white/60 px-4 py-2 font-medium text-slate-800 transition hover:bg-white/82"
            >
              Back to park overview
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-[color:color-mix(in_srgb,var(--surface-strong)_78%,black_22%)] p-5 shadow-[var(--shadow-soft)] backdrop-blur sm:p-6 lg:p-8">
        <ParkTrailsExplorer
          trails={park.trails}
          parkName={park.name}
          visualImageUrl={visual.imageUrl}
          mode="full"
          theme="dark"
        />
      </section>
    </main>
  );
}
