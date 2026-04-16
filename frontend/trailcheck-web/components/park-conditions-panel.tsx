import { getParkDigest } from '@/lib/api';
import type { WeatherPeriod } from '@/lib/api';

type ParkConditionsPanelProps = {
  parkSlug: string;
};

export async function ParkNotificationCard({
  parkSlug,
}: ParkConditionsPanelProps) {
  const digest = await getParkDigest(parkSlug).catch(() => null);

  return (
    <div className="w-full rounded-[1.35rem] border border-amber-300/35 bg-[linear-gradient(180deg,rgba(255,251,235,0.9),rgba(255,247,237,0.82))] p-4 text-[var(--ink-on-light)] shadow-[0_18px_40px_rgba(15,23,42,0.16)] backdrop-blur-sm lg:mt-1 lg:max-w-md">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800/80">
        Notification
      </p>
      <p className="mt-3 text-base font-medium leading-7 text-amber-950">
        {digest?.notification ??
          'Live park condition notices are currently unavailable.'}
      </p>
    </div>
  );
}

export function ParkNotificationCardFallback() {
  return (
    <div className="h-28 w-full animate-pulse rounded-[1.35rem] bg-white/10 lg:mt-1 lg:max-w-md" />
  );
}

export async function ParkConditionsPanel({
  parkSlug,
}: ParkConditionsPanelProps) {
  const digest = await getParkDigest(parkSlug).catch(() => null);
  const forecastPeriods = digest?.weather?.forecast ?? [];

  return (
    <section className="px-1">
      <div className="border-b border-[var(--border)]/70 px-4 py-5 sm:px-5">
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

      <div className="px-4 py-6 sm:px-5">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-start">
          <div className="border-b border-[var(--border)]/70 pb-5 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]/82">
              Summary
            </p>
            <p className="mt-4 text-lg font-semibold leading-8 text-[var(--foreground)]">
              {digest?.shortSummary ??
                'A park-wide summary will appear here when live condition data is available.'}
            </p>
          </div>

          <div className="lg:pl-1">
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
                    className="rounded-[1rem] border border-[var(--border)] bg-[var(--surface)]/78 px-4 py-3"
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
      </div>

      <div className="border-t border-[var(--border)]/70 px-4 py-6 sm:px-5">
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
                  <p className="mt-1 text-sm text-sky-800/80">
                    {period.shortForecast}
                  </p>
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
  );
}

export function ParkConditionsPanelFallback() {
  return (
    <section className="px-1">
      <div className="border-b border-[var(--border)]/70 px-4 py-5 sm:px-5">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--accent-strong)]/75">
          Park Conditions
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Alerts, hazards, and park summary
        </h2>
      </div>
      <div className="space-y-4 px-4 py-6 sm:px-5">
        <div className="h-28 animate-pulse rounded-[1.25rem] bg-white/10" />
        <div className="h-32 animate-pulse rounded-[1.25rem] bg-white/10" />
        <div className="h-56 animate-pulse rounded-[1.25rem] bg-white/10" />
      </div>
    </section>
  );
}
