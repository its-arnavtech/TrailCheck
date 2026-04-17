import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ParkConditionsPanel,
  ParkConditionsPanelFallback,
  ParkNotificationCard,
  ParkNotificationCardFallback,
} from '@/components/park-conditions-panel';
import ParkMapCard from '@/components/park-map-card';
import PageNavbar from '@/components/page-navbar';
import ParkPreferenceActions from '@/components/park-preference-actions';
import ReportAuthCta from '@/components/report-auth-cta';
import { getPark } from '@/lib/api';
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
  const visual = await getParkVisual(park.slug, park.name);
  const coordinates = getParkCoordinates(park.slug);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[min(100%,1440px)] flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
      <PageNavbar parkHref={`/parks/${park.slug}`} parkLabel={park.name} />

      <section className="relative overflow-hidden rounded-[2rem] border border-[var(--border)] shadow-[var(--shadow-soft)]">
        <img
          src={visual.imageUrl}
          alt={visual.imageAlt}
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(22,29,38,0.88),rgba(51,67,84,0.46),rgba(255,255,255,0.05))]" />
        <div className="relative p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.7fr)] lg:items-start">
            <div>
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

            <div className="flex h-full lg:justify-end">
              <Suspense fallback={<ParkNotificationCardFallback />}>
                <ParkNotificationCard parkSlug={park.slug} />
              </Suspense>
            </div>
          </div>

          <div className="mt-6">
            <ParkPreferenceActions parkSlug={park.slug} parkName={park.name} />
          </div>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.95fr]">
        <div className="space-y-8">
          <Suspense fallback={<ParkConditionsPanelFallback />}>
            <ParkConditionsPanel parkSlug={park.slug} />
          </Suspense>
        </div>

        <div className="space-y-8">
          <ParkMapCard
            parkName={park.name}
            state={park.state}
            latitude={coordinates?.lat}
            longitude={coordinates?.lng}
            formattedLocation={park.state}
          />

          <section className="rounded-[1.8rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)] backdrop-blur sm:p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent-strong)]/72">
              Trails
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
              Browse trails on a dedicated page
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--foreground)]/68">
              Trail highlights now live on their own page so the park overview stays easier to scan.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[1.4rem] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-4">
              <span className="text-sm font-medium text-[var(--foreground)]/72">
                {park.trails.length} trail{park.trails.length === 1 ? '' : 's'} ready to explore
              </span>
              <Link
                href={`/parks/${park.slug}/trails`}
                className="rounded-full bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Open trails page
              </Link>
            </div>
          </section>
        </div>
      </div>

      <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)]/94 p-5 shadow-[var(--shadow-soft)] backdrop-blur sm:p-6 lg:p-8">
        <div className="space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 xl:block">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent-strong)]/72">
                  Community reporting
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                  Submit a report
                </h2>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                Protected route
              </span>
            </div>
            <p className="max-w-xl text-sm leading-7 text-[var(--foreground)]/68">
              Sign in, choose a trail in this park, and share a quick conditions update so the next
              visitor has fresher context.
            </p>
            <ReportAuthCta />
          </div>

          <ParkReportPanel trails={park.trails} flush />
        </div>
      </section>
    </main>
  );
}
