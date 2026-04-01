import Link from 'next/link';
import { notFound } from 'next/navigation';
import AuthPanel from '@/components/auth-panel';
import ReportForm from '@/components/reportform';
import { getTrail } from '@/lib/api';
import type { Hazard, NpsAlert, TrailReport, WeatherPeriod } from '@/lib/api';

type TrailPageProps = {
  params: Promise<{ id: string }>;
};

const severityColor: Record<string, string> = {
  LOW: 'bg-yellow-100 text-yellow-800',
  MEDIUM: 'bg-orange-100 text-orange-800',
  HIGH: 'bg-red-100 text-red-800',
};

const statusColor: Record<string, string> = {
  OPEN: 'bg-emerald-100 text-emerald-800',
  CAUTION: 'bg-amber-100 text-amber-800',
  CLOSED: 'bg-rose-100 text-rose-800',
};

function formatSurfaceCondition(surfaceCondition: string) {
  return surfaceCondition
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^\w/, (char) => char.toUpperCase());
}

export default async function TrailPage({ params }: TrailPageProps) {
  const { id } = await params;
  const trail = await getTrail(id);

  if (!trail) notFound();

  const forecastPeriods = trail.weather?.forecast ?? [];
  const hasOddForecastCount = forecastPeriods.length % 2 === 1;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10">
      <section className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[linear-gradient(145deg,var(--hero-start),color-mix(in_srgb,var(--hero-end)_72%,white_28%))] p-6 shadow-[var(--shadow-soft)] sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-medium uppercase tracking-[0.24em] text-[var(--accent-strong)]/70">
              Trail overview
            </p>
            {trail.park?.slug && (
              <Link
                href={`/parks/${trail.park.slug}`}
                className="mb-4 inline-flex rounded-full border border-white/65 bg-white/55 px-4 py-2 text-sm font-medium text-emerald-950 transition hover:bg-white/72"
              >
                Back to park
              </Link>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight text-emerald-950 sm:text-4xl">{trail.name}</h1>
              {trail.status && (
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor[trail.status] ?? 'bg-gray-100 text-gray-700'}`}>
                  {trail.status}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-emerald-950/70">{trail.park?.name ?? 'Unknown park'}</p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-emerald-950/78">
              {trail.lengthMiles && <span className="rounded-full border border-white/65 bg-white/55 px-4 py-2">{trail.lengthMiles} miles</span>}
              {trail.difficulty && <span className="rounded-full border border-white/65 bg-white/55 px-4 py-2">{trail.difficulty}</span>}
            </div>
            {trail.description && (
              <p className="mt-4 max-w-2xl text-sm leading-7 text-emerald-950/78 sm:text-base">{trail.description}</p>
            )}
          </div>

          <div className="grid min-w-[220px] gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-2xl border border-white/60 bg-white/55 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-strong)]/75">Reports</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-950">{trail.reports?.length ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/55 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-strong)]/75">Hazards</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-950">{trail.hazards?.length ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/55 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-strong)]/75">Alerts</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-950">{trail.npsAlerts?.length ?? 0}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[1.35fr_0.95fr]">
        <div className="space-y-8">
          <section className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)] backdrop-blur sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">Park alerts</h2>
              <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                NPS feed
              </span>
            </div>
            {trail.npsAlerts && trail.npsAlerts.length > 0 ? (
              <div className="space-y-3">
                {trail.npsAlerts.map((alert: NpsAlert) => (
                  <div key={alert.id} className="rounded-2xl border border-orange-200 bg-[linear-gradient(180deg,#fff7ed,#fff1dd)] p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-orange-950">{alert.title}</p>
                      <span className="shrink-0 rounded-full bg-orange-200 px-2 py-0.5 text-xs text-orange-800">
                        {alert.category}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-orange-900/78 line-clamp-3">{alert.description}</p>
                    {alert.url && (
                      <a
                        href={alert.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-block text-xs font-medium text-orange-700 underline underline-offset-4"
                      >
                        More info
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--foreground)]/60">No current park alerts.</p>
            )}
          </section>

          <section className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)] backdrop-blur sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">Reported hazards</h2>
              <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                Community
              </span>
            </div>
            {trail.hazards && trail.hazards.length > 0 ? (
              <div className="space-y-3">
                {trail.hazards.map((hazard: Hazard) => (
                  <div key={hazard.id} className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-white/75 p-4">
                    <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${severityColor[hazard.severity] ?? 'bg-gray-100 text-gray-700'}`}>
                      {hazard.severity}
                    </span>
                    <div>
                      <p className="font-medium text-[var(--foreground)]">{hazard.title}</p>
                      {hazard.description && (
                        <p className="mt-1 text-sm text-[var(--foreground)]/66">{hazard.description}</p>
                      )}
                      <p className="mt-2 text-xs uppercase tracking-[0.14em] text-[var(--foreground)]/40">{hazard.type}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--foreground)]/60">No active hazards reported.</p>
            )}
          </section>

          <section className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)] backdrop-blur sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">Recent reports</h2>
              <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
                Latest trail check-ins
              </span>
            </div>
            <div className="space-y-3">
              {trail.reports?.length ? (
                trail.reports.map((report: TrailReport) => (
                  <div key={report.id} className="rounded-2xl border border-[var(--border)] bg-white/80 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-[var(--foreground)]">
                        {report.reporterName ?? 'Anonymous'}
                      </span>
                      <span className="text-sm text-amber-500">
                        {'\u2605'.repeat(report.conditionRating)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--foreground)]/76">{report.note || 'No notes provided.'}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.14em] text-[var(--foreground)]/42">
                      {formatSurfaceCondition(report.surfaceCondition)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--foreground)]/60">No reports yet.</p>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className="self-start rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)] backdrop-blur sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">Weather forecast</h2>
              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                Short range
              </span>
            </div>
            {forecastPeriods.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {forecastPeriods.map((period: WeatherPeriod, index: number) => (
                  <div
                    key={period.name}
                    className={`rounded-2xl border border-sky-200 bg-[linear-gradient(180deg,#eff8ff,#dff1ff)] p-4 text-center ${
                      hasOddForecastCount && index === forecastPeriods.length - 1 ? 'sm:col-span-2' : ''
                    }`}
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
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-sky-700/80">{period.windSpeed}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--foreground)]/60">Weather data is not available right now.</p>
            )}
          </section>
        </div>
      </div>

      <section className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)] backdrop-blur sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">Submit a report</h2>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
            Protected route
          </span>
        </div>
        <p className="mb-4 max-w-4xl text-sm leading-6 text-[var(--foreground)]/64">
          Sign in with a TrailCheck account, then share a quick surface update so the next visitor has fresher context.
        </p>
        <div className="mb-4">
          <AuthPanel compact />
        </div>
        <ReportForm trailId={trail.id} />
      </section>
    </main>
  );
}
