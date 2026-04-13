import Link from 'next/link';
import { notFound } from 'next/navigation';
import AuthPanel from '@/components/auth-panel';
import ParkPreferenceActions from '@/components/park-preference-actions';
import ParkReportPanel from '@/components/park-report-panel';
import ParkTrailsExplorer from '@/components/park-trails-explorer';
import { getPark, getParkDigest } from '@/lib/api';
import { getParkVisual } from '@/lib/park-content';
import type { WeatherPeriod } from '@/lib/api';

type ParkPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ParkPage({ params }: ParkPageProps) {
  const { slug } = await params;
  const [park, digest] = await Promise.all([getPark(slug), getParkDigest(slug).catch(() => null)]);

  if (!park) notFound();
  const visual = await getParkVisual(park.slug, park.name);
  const forecastPeriods = digest?.weather?.forecast ?? [];

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
          <div className="mt-6">
            <ParkPreferenceActions parkSlug={park.slug} parkName={park.name} />
          </div>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.95fr]">
        <div className="space-y-8">
          <section className="overflow-hidden rounded-[1.75rem] border border-[var(--accent)]/24 bg-[linear-gradient(145deg,color-mix(in_srgb,var(--surface)_85%,white_15%),color-mix(in_srgb,var(--accent-soft)_22%,white_78%))] shadow-[var(--shadow-soft)]">
            <div className="border-b border-[var(--border)]/70 px-5 py-5 sm:px-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--accent-strong)]/75">
                    Park Conditions
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                    Alerts, hazards, and park summary
                  </h2>
                </div>
              </div>
            </div>

            <div className="grid gap-6 px-5 py-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] sm:px-6">
              <div className="space-y-4">
                <div className="rounded-[1.35rem] border border-amber-300/40 bg-amber-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800/80">
                    Notification
                  </p>
                  <p className="mt-3 text-base font-medium leading-7 text-amber-950">
                    {digest?.notification ?? 'Live park condition notices are currently unavailable.'}
                  </p>
                </div>

                <div className="rounded-[1.35rem] border border-[var(--border)] bg-[var(--surface)]/92 p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
                      Active hazards
                    </h3>
                    <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                      Live feeds
                    </span>
                  </div>

                  {digest?.hazards?.length ? (
                    <div className="space-y-3">
                      {digest.hazards.slice(0, 4).map((hazard) => (
                        <article
                          key={hazard.id}
                          className="rounded-[1rem] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                                hazard.severity === 'high'
                                  ? 'bg-rose-100 text-rose-700'
                                  : hazard.severity === 'moderate'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {hazard.severity}
                            </span>
                            <span className="text-xs uppercase tracking-[0.16em] text-[var(--foreground)]/45">
                              {hazard.source}
                            </span>
                          </div>
                          <h4 className="mt-3 text-base font-semibold text-[var(--foreground)]">
                            {hazard.title}
                          </h4>
                          <p className="mt-2 text-sm leading-6 text-[var(--foreground)]/68">
                            {hazard.summary}
                          </p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm leading-6 text-[var(--foreground)]/62">
                      No active hazards were identified from the current park feeds.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <div className="rounded-[1.35rem] border border-[var(--accent)]/28 bg-[linear-gradient(150deg,color-mix(in_srgb,var(--accent-soft)_68%,white_32%)_0%,rgba(255,255,255,0.94)_100%)] p-5 text-[var(--ink-on-light)] shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]/82">
                    Summary
                  </p>
                  <p className="mt-4 text-lg font-semibold leading-8 text-[var(--ink-on-light)]">
                    {digest?.shortSummary ?? 'A park-wide summary will appear here when live condition data is available.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--border)]/70 px-5 py-6 sm:px-6">
              <div className="w-full rounded-[1.35rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
                    Weather forecast
                  </h3>
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                    NWS forecast
                  </span>
                </div>
                {forecastPeriods.length > 0 ? (
                  <div className="grid auto-rows-fr grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {forecastPeriods.map((period: WeatherPeriod) => (
                      <div
                        key={period.name}
                        className="flex h-full flex-col items-center rounded-2xl border border-sky-200 bg-[linear-gradient(180deg,#eff8ff,#dff1ff)] p-4 text-center"
                      >
                        <p className="font-semibold text-sky-950">{period.name}</p>
                        <img
                          src={period.icon}
                          alt={period.shortForecast}
                          className="mx-auto my-2 h-12 w-12"
                        />
                        <p className="text-2xl font-bold text-sky-800">
                          {period.temperature}&deg;{period.temperatureUnit}
                        </p>
                        <p className="mt-1 text-sm text-sky-800/80">{period.shortForecast}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.14em] text-sky-700/80">
                          {period.windSpeed}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-[var(--foreground)]/62">
                    Weather data is not available right now.
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)] backdrop-blur sm:p-6">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--accent-strong)]/75">
                Trails
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
                Available routes
              </h2>
            </div>

            <div className="mt-5">
              <ParkTrailsExplorer trails={park.trails} />
            </div>
          </section>
        </div>
      </div>

      <section className="w-full rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)] backdrop-blur sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
            Submit a report
          </h2>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
            Protected route
          </span>
        </div>
        <p className="mb-4 max-w-4xl text-sm leading-6 text-[var(--foreground)]/64">
          Sign in, choose a trail in this park, and share a quick conditions update so the next visitor has fresher context.
        </p>
        <div className="mb-4">
          <AuthPanel compact />
        </div>
        <ParkReportPanel trails={park.trails} />
      </section>
    </main>
  );
}
