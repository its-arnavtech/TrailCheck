import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ParkConditionsPanel } from '@/components/park-conditions-panel';
import Footer from '@/components/footer';
import ParkMapCard from '@/components/park-map-card';
import PageNavbar from '@/components/page-navbar';
import ParkPreferenceActions from '@/components/park-preference-actions';
import ParkTrailsExplorer from '@/components/park-trails-explorer';
import ReportAuthCta from '@/components/report-auth-cta';
import RiskBadge from '@/components/risk-badge';
import { getPark, getParkDigest } from '@/lib/api';
import { getParkCoordinates } from '@/lib/park-globe-data';
import { getParkVisual } from '@/lib/park-content';

const ParkReportPanel = dynamic(() => import('@/components/park-report-panel'));

type ParkPageProps = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 300;

export default async function ParkPage({ params }: ParkPageProps) {
  const { slug } = await params;
  const park = await getPark(slug);

  if (!park) notFound();

  const [visual, digest] = await Promise.all([
    getParkVisual(park.slug, park.name),
    getParkDigest(park.slug).catch(() => null),
  ]);
  const coordinates = getParkCoordinates(park.slug);
  const riskLevel =
    digest?.structuredOutput?.riskLevel ?? digest?.hazards[0]?.severity?.toUpperCase() ?? 'LOW';

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
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(4,10,14,0.9),rgba(7,18,23,0.56),rgba(4,10,14,0.92))]" />
          <div className="relative p-6 sm:p-8 lg:p-10">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.64fr)] lg:items-end">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent-strong)]/68">
                  {visual.eyebrow}
                </p>
                <h1 className="mt-4 text-5xl text-white sm:text-6xl" data-display="true">
                  {park.name}
                </h1>
                <p className="mt-4 text-base leading-8 text-white/74 sm:text-lg">
                  {visual.tagline} TrailCheck highlights the current risk picture, active hazards,
                  weather shifts, and route-level detail for safer planning.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <RiskBadge level={riskLevel} />
                  <span className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm font-medium text-white/76">
                    {park.trails.length} trail{park.trails.length === 1 ? '' : 's'}
                  </span>
                  <Link
                    href={`/parks/${park.slug}/trails`}
                    className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                  >
                    Open all trails
                  </Link>
                </div>
              </div>

              <div className="glass-panel-light rounded-[1.6rem] p-5 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/54">
                  Safety posture
                </p>
                <p className="mt-3 text-base leading-7 text-white/84">
                  {digest?.notification ??
                    'Live digest data is temporarily unavailable, but trail pages and reporting remain online.'}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="rounded-[1rem] border border-white/12 bg-black/14 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/44">Hazards</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{digest?.hazards.length ?? 0}</p>
                  </div>
                  <div className="rounded-[1rem] border border-white/12 bg-black/14 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/44">Alerts</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{digest?.alerts.length ?? 0}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <ParkPreferenceActions parkSlug={park.slug} parkName={park.name} />
            </div>
          </div>
        </section>

        <ParkConditionsPanel parkSlug={park.slug} parkName={park.name} digest={digest} />

        <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="glass-panel topo-ring rounded-[1.75rem] p-5 sm:p-6">
            <ParkTrailsExplorer
              trails={park.trails}
              parkName={park.name}
              visualImageUrl={visual.imageUrl}
              mode="preview"
              theme="light"
            />
          </section>

          <div className="space-y-8">
            <ParkMapCard
              parkName={park.name}
              state={park.state}
              latitude={coordinates?.lat}
              longitude={coordinates?.lng}
              formattedLocation={park.state}
            />

            <section className="glass-panel topo-ring rounded-[1.75rem] p-5 sm:p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent-strong)]/72">
                Trail directory
              </p>
              <h2 className="mt-3 text-3xl text-white" data-display="true">
                Browse every route in one sweep.
              </h2>
              <p className="mt-3 text-sm leading-7 text-white/68">
                Use the dedicated trails page for a larger visual directory and direct jumps into
                each trail’s conditions dashboard.
              </p>
              <Link
                href={`/parks/${park.slug}/trails`}
                className="mt-5 inline-flex rounded-full bg-[linear-gradient(135deg,#6d8f80,#c8ddcf)] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-105"
              >
                Open trails page
              </Link>
            </section>
          </div>
        </div>

        <section className="glass-panel topo-ring rounded-[2rem] p-5 sm:p-6 lg:p-8">
          <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr] xl:items-start">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 xl:block">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent-strong)]/72">
                    Community reporting
                  </p>
                  <h2 className="mt-3 text-3xl text-white" data-display="true">
                    Leave a fresh trail signal.
                  </h2>
                </div>
                <span className="rounded-full border border-emerald-300/16 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                  Protected route
                </span>
              </div>
              <p className="max-w-xl text-sm leading-7 text-white/68">
                Sign in, choose a trail in this park, and share a quick field note so the next
                visitor gets newer context than static signage alone.
              </p>
              <div className="rounded-[1.4rem] border border-white/10 bg-white/6 p-4">
                <ReportAuthCta />
              </div>
            </div>

            <div className="rounded-[1.55rem] border border-white/10 bg-black/12 p-4 sm:p-5">
              <ParkReportPanel trails={park.trails} flush />
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </main>
  );
}
