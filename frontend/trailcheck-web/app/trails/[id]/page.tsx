import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Footer from '@/components/footer';
import HazardTag from '@/components/hazard-tag';
import PageNavbar from '@/components/page-navbar';
import ReportAuthCta from '@/components/report-auth-cta';
import ReportCard from '@/components/report-card';
import RiskBadge from '@/components/risk-badge';
import WeatherCard from '@/components/weather-card';
import { getTrail } from '@/lib/api';
import { getParkVisual } from '@/lib/park-content';
import type { Hazard, NpsAlert } from '@/lib/api';

const ReportForm = dynamic(() => import('@/components/reportform'));

type TrailPageProps = {
  params: Promise<{ id: string }>;
};

export const revalidate = 120;

const statusCopy: Record<string, string> = {
  OPEN: 'Route currently open',
  CAUTION: 'Proceed with elevated caution',
  CLOSED: 'Route currently closed',
};

export default async function TrailPage({ params }: TrailPageProps) {
  const { id } = await params;
  const trail = await getTrail(id);

  if (!trail) notFound();

  const trailVisual =
    trail.park?.slug && trail.park?.name
      ? await getParkVisual(trail.park.slug, trail.park.name)
      : null;
  const forecastPeriods = trail.weather?.forecast ?? [];
  const hasOddForecastCount = forecastPeriods.length % 2 === 1;
  const derivedRisk =
    trail.hazards?.some((hazard) => hazard.severity === 'HIGH')
      ? 'HIGH'
      : trail.hazards?.some((hazard) => hazard.severity === 'MEDIUM')
        ? 'MODERATE'
        : 'LOW';

  return (
    <main className="min-h-screen pb-10">
      <div className="section-shell flex flex-col gap-8 pt-6 sm:pt-8">
        <PageNavbar
          parkHref={trail.park?.slug ? `/parks/${trail.park.slug}` : undefined}
          parkLabel={trail.park?.name}
          trailHref={`/trails/${trail.id}`}
          trailLabel={trail.name}
        />

        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 shadow-[var(--shadow-card)]">
          {trailVisual ? (
            <Image
              src={trailVisual.imageUrl}
              alt={trailVisual.imageAlt}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          ) : null}
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(4,10,14,0.88),rgba(5,15,20,0.54),rgba(4,10,14,0.92))]" />
          <div className="relative flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="mb-3 text-sm font-medium uppercase tracking-[0.24em] text-[var(--accent-strong)]/70">
                Trail overview
              </p>
              {trail.park?.slug ? (
                <Link
                  href={`/parks/${trail.park.slug}`}
                  className="mb-4 inline-flex items-center text-sm font-semibold text-white/72 transition hover:text-white"
                >
                  Back to {trail.park?.name}
                </Link>
              ) : null}
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-5xl text-white sm:text-6xl" data-display="true">
                  {trail.name}
                </h1>
                {trail.status ? (
                  <span className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/72">
                    {trail.status}
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-base text-white/72">{trail.park?.name ?? 'Unknown park'}</p>
              <div className="mt-5 flex flex-wrap gap-3 text-sm text-white">
                {trail.lengthMiles ? (
                  <span className="rounded-full border border-white/12 bg-white/6 px-4 py-2">
                    {trail.lengthMiles} miles
                  </span>
                ) : null}
                {trail.difficulty ? (
                  <span className="rounded-full border border-white/12 bg-white/6 px-4 py-2">
                    {trail.difficulty}
                  </span>
                ) : null}
                {trail.status ? (
                  <span className="rounded-full border border-white/12 bg-white/6 px-4 py-2">
                    {statusCopy[trail.status] ?? trail.status}
                  </span>
                ) : null}
              </div>
              {trail.description ? (
                <p className="mt-5 max-w-2xl text-sm leading-7 text-white/74 sm:text-base">
                  {trail.description}
                </p>
              ) : null}
            </div>

            <div className="grid min-w-[220px] gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="glass-panel-light rounded-[1.2rem] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/54">Reports</p>
                <p className="mt-2 text-3xl font-semibold text-white">{trail.reports?.length ?? 0}</p>
              </div>
              <div className="glass-panel-light rounded-[1.2rem] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/54">Hazards</p>
                <p className="mt-2 text-3xl font-semibold text-white">{trail.hazards?.length ?? 0}</p>
              </div>
              <div className="glass-panel-light rounded-[1.2rem] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/54">Alerts</p>
                <p className="mt-2 text-3xl font-semibold text-white">{trail.npsAlerts?.length ?? 0}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="glass-panel topo-ring rounded-[1.75rem] p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent-strong)]/72">
                  Conditions
                </p>
                <h2 className="mt-3 text-3xl text-white" data-display="true">
                  Route condition snapshot
                </h2>
              </div>
              <RiskBadge level={derivedRisk} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.3rem] border border-white/10 bg-white/6 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-white/44">Status</p>
                <p className="mt-3 text-xl font-semibold text-white">
                  {trail.status ?? 'Unknown'}
                </p>
                <p className="mt-2 text-sm leading-6 text-white/66">
                  {trail.status ? statusCopy[trail.status] ?? trail.status : 'Current route status is unavailable.'}
                </p>
              </div>
              <div className="rounded-[1.3rem] border border-white/10 bg-white/6 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-white/44">Route traits</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {trail.difficulty ? <HazardTag label={trail.difficulty} /> : null}
                  {trail.lengthMiles ? <HazardTag label={`${trail.lengthMiles} miles`} /> : null}
                  <HazardTag label={`${trail.reports?.length ?? 0} reports`} />
                </div>
                <p className="mt-3 text-sm leading-6 text-white/66">
                  This card keeps the essential trail-read variables visible before you scroll into details.
                </p>
              </div>
            </div>
          </section>

          <section className="glass-panel topo-ring rounded-[1.75rem] p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-3xl text-white" data-display="true">
                Weather cards
              </h2>
              <span className="rounded-full border border-sky-200/18 bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-100">
                Short range
              </span>
            </div>
            {forecastPeriods.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {forecastPeriods.map((period, index) => (
                  <div
                    key={period.name}
                    className={hasOddForecastCount && index === forecastPeriods.length - 1 ? 'sm:col-span-2' : ''}
                  >
                    <WeatherCard period={period} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/60">Weather data is not available right now.</p>
            )}
          </section>
        </div>

        <div className="grid gap-8 xl:grid-cols-[1fr_1fr]">
          <section className="glass-panel topo-ring rounded-[1.75rem] p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-3xl text-white" data-display="true">
                Hazards
              </h2>
              <span className="rounded-full border border-rose-300/16 bg-rose-400/10 px-3 py-1 text-xs font-semibold text-rose-100">
                Live + community
              </span>
            </div>
            {trail.hazards && trail.hazards.length > 0 ? (
              <div className="space-y-3">
                {trail.hazards.map((hazard: Hazard) => (
                  <article key={hazard.id} className="rounded-[1.25rem] border border-white/10 bg-white/6 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <RiskBadge level={hazard.severity} label={hazard.type} subtle />
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-white">{hazard.title}</h3>
                    {hazard.description ? (
                      <p className="mt-2 text-sm leading-6 text-white/70">{hazard.description}</p>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/60">No active hazards reported.</p>
            )}
          </section>

          <section className="glass-panel topo-ring rounded-[1.75rem] p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-3xl text-white" data-display="true">
                Park alerts
              </h2>
              <span className="rounded-full border border-orange-300/16 bg-orange-400/10 px-3 py-1 text-xs font-semibold text-orange-100">
                NPS feed
              </span>
            </div>
            {trail.npsAlerts && trail.npsAlerts.length > 0 ? (
              <div className="space-y-3">
                {trail.npsAlerts.map((alert: NpsAlert) => (
                  <article key={alert.id} className="rounded-[1.25rem] border border-white/10 bg-white/6 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-white">{alert.title}</p>
                      <HazardTag label={alert.category} />
                    </div>
                    <p className="mt-2 line-clamp-4 text-sm leading-6 text-white/68">
                      {alert.description}
                    </p>
                    {alert.url ? (
                      <a
                        href={alert.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-strong)]"
                      >
                        More info
                      </a>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/60">No current park alerts.</p>
            )}
          </section>
        </div>

        <div className="grid gap-8 xl:grid-cols-[1fr_1fr]">
          <section className="glass-panel topo-ring rounded-[1.75rem] p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-3xl text-white" data-display="true">
                Report system
              </h2>
              <span className="rounded-full border border-emerald-300/16 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                Protected route
              </span>
            </div>
            <p className="max-w-xl text-sm leading-7 text-white/68">
              Sign in with a TrailCheck account, then share a quick surface update so the next
              visitor has fresher context before they head out.
            </p>
            <div className="mt-4 rounded-[1.35rem] border border-white/10 bg-white/6 p-4">
              <ReportAuthCta />
            </div>

            <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-black/12 p-4 sm:p-5">
              <ReportForm trailId={trail.id} />
            </div>
          </section>

          <section className="glass-panel topo-ring rounded-[1.75rem] p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-3xl text-white" data-display="true">
                Recent reports
              </h2>
              <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-semibold text-white/70">
                Latest trail check-ins
              </span>
            </div>
            <div className="space-y-3">
              {trail.reports?.length ? (
                trail.reports.map((report) => <ReportCard key={report.id} report={report} />)
              ) : (
                <p className="text-sm text-white/60">No reports yet.</p>
              )}
            </div>
          </section>
        </div>
      </div>

      <Footer />
    </main>
  );
}
