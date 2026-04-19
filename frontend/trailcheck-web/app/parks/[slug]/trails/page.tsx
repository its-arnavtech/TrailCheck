import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Footer from '@/components/footer';
import PageNavbar from '@/components/page-navbar';
import ParkTrailsExplorer from '@/components/park-trails-explorer';
import { getPark, getParkDigest } from '@/lib/api';
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

  const [visual, digest] = await Promise.all([
    getParkVisual(park.slug, park.name),
    getParkDigest(park.slug).catch(() => null),
  ]);

  return (
    <main className="min-h-screen pb-10">
      <div className="section-shell flex flex-col gap-8 pt-6 sm:pt-8">
        <PageNavbar parkHref={`/parks/${park.slug}`} parkLabel={park.name} />

        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 shadow-[var(--shadow-card)]">
          <Image
            src={visual.imageUrl}
            alt={visual.imageAlt}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(4,10,14,0.86),rgba(5,14,18,0.58),rgba(4,10,14,0.94))]" />
          <div className="relative space-y-6 p-6 sm:p-8 lg:p-10">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.26em] text-[var(--accent-strong)]/72">
                Trail Directory
              </p>
              <h1 className="mt-4 text-5xl text-white sm:text-6xl" data-display="true">
                Explore every trail in {park.name}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-white/74">
                Scan the full route directory, then jump into individual trail pages for live
                conditions, hazards, weather, and community reporting.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 text-sm">
              <span className="rounded-full border border-white/12 bg-white/6 px-4 py-2 font-medium text-white">
                {park.trails.length} trail{park.trails.length === 1 ? '' : 's'}
              </span>
              <span className="rounded-full border border-white/12 bg-white/6 px-4 py-2 font-medium text-white/76">
                {digest?.hazards.length ?? 0} active park hazards
              </span>
              <Link
                href={`/parks/${park.slug}`}
                className="rounded-full border border-white/12 bg-white/6 px-4 py-2 font-medium text-white/80 transition hover:bg-white/10"
              >
                Back to park overview
              </Link>
            </div>
          </div>
        </section>

        <section className="glass-panel topo-ring rounded-[2rem] p-5 sm:p-6 lg:p-8">
          <ParkTrailsExplorer
            trails={park.trails}
            parkName={park.name}
            visualImageUrl={visual.imageUrl}
            mode="full"
            theme="dark"
          />
        </section>
      </div>

      <Footer />
    </main>
  );
}
