import type { ParkDigest } from '@/lib/api';
import HazardTag from '@/components/hazard-tag';
import RiskBadge from '@/components/risk-badge';
import WeatherCard from '@/components/weather-card';

type SafetyDigestProps = {
  digest: ParkDigest | null;
  parkName?: string;
  compact?: boolean;
};

function getRiskLevel(digest: ParkDigest | null) {
  return digest?.structuredOutput?.riskLevel ?? digest?.hazards[0]?.severity?.toUpperCase() ?? 'LOW';
}

export default function SafetyDigest({
  digest,
  parkName,
  compact = false,
}: SafetyDigestProps) {
  const riskLevel = getRiskLevel(digest);
  const weather = digest?.weather?.forecast ?? [];
  const hazards = digest?.hazards ?? [];
  const alerts = digest?.alerts ?? [];
  const recommendation = digest?.structuredOutput?.recommendedAction;
  const sourceLabel = digest?.generationSource ?? 'Fallback';

  return (
    <section className="glass-panel topo-ring overflow-hidden rounded-[1.75rem] p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent-strong)]/64">
              AI Safety Digest
            </p>
            <RiskBadge level={riskLevel} />
          </div>
          <h2 className="mt-4 text-3xl text-white sm:text-4xl" data-display="true">
            {parkName ? `${parkName} at a glance` : 'Today’s safety readout'}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/74 sm:text-base">
            {digest?.notification ??
              'The digest will appear here once live park conditions, alerts, and forecast signals are available.'}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:w-[20rem] lg:grid-cols-1">
          <div className="overflow-hidden rounded-[1.15rem] border border-orange-300/18 bg-[linear-gradient(135deg,rgba(92,43,21,0.92),rgba(192,94,51,0.26))] px-4 py-3 shadow-[0_14px_28px_rgba(0,0,0,0.18)]">
            <p className="text-xs uppercase tracking-[0.18em] text-orange-100/72">Hazards</p>
            <p className="mt-2 text-3xl font-semibold text-white">{hazards.length}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-orange-100/56">
              Active trail signals
            </p>
          </div>
          <div className="overflow-hidden rounded-[1.15rem] border border-sky-300/18 bg-[linear-gradient(135deg,rgba(19,60,88,0.92),rgba(75,138,192,0.24))] px-4 py-3 shadow-[0_14px_28px_rgba(0,0,0,0.18)]">
            <p className="text-xs uppercase tracking-[0.18em] text-sky-100/72">Alerts</p>
            <p className="mt-2 text-3xl font-semibold text-white">{alerts.length}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-sky-100/56">
              NPS bulletin feed
            </p>
          </div>
          <div className="overflow-hidden rounded-[1.15rem] border border-emerald-300/18 bg-[linear-gradient(135deg,rgba(22,69,58,0.92),rgba(119,173,147,0.24))] px-4 py-3 shadow-[0_14px_28px_rgba(0,0,0,0.18)]">
            <p className="text-xs uppercase tracking-[0.18em] text-emerald-100/72">Source</p>
            <p className="mt-2 text-base font-semibold text-white/92">
              {sourceLabel}
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-emerald-100/56">
              Digest engine
            </p>
          </div>
        </div>
      </div>

      <div className={`mt-6 grid gap-6 ${compact ? 'xl:grid-cols-[1.1fr_0.9fr]' : 'xl:grid-cols-[1fr_0.95fr]'}`}>
        <div className="space-y-4">
          <div className="rounded-[1.35rem] border border-white/10 bg-black/16 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/44">Summary</p>
            <p className="mt-3 text-sm leading-7 text-white/76 sm:text-base">
              {digest?.shortSummary ??
                'Live conditions are temporarily unavailable, but TrailCheck will keep this panel ready for the next successful refresh.'}
            </p>
            {recommendation ? (
              <p className="mt-4 rounded-[1rem] border border-[var(--accent)]/22 bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent-strong)]">
                {recommendation}
              </p>
            ) : null}
          </div>

          <div className="rounded-[1.35rem] border border-white/10 bg-black/16 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/44">Active signals</p>
              <span className="text-xs text-white/40">{hazards.length > 0 ? 'Live now' : 'Quiet feed'}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {hazards.length > 0 ? (
                hazards.slice(0, compact ? 4 : 6).map((hazard) => (
                  <HazardTag key={hazard.id} label={hazard.title} severity={hazard.severity} />
                ))
              ) : (
                <span className="text-sm text-white/58">No park-wide hazards are currently highlighted.</span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {!compact && weather.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {weather.slice(0, 4).map((period) => (
                <WeatherCard key={period.name} period={period} />
              ))}
            </div>
          ) : (
            <div className="rounded-[1.35rem] border border-white/10 bg-black/16 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/44">Alerts digest</p>
              <div className="mt-4 space-y-3">
                {alerts.length > 0 ? (
                  alerts.slice(0, 3).map((alert) => (
                    <article key={alert.id} className="rounded-[1rem] border border-white/10 bg-white/6 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-white">{alert.title}</p>
                        <span className="rounded-full border border-white/12 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-white/56">
                          {alert.category}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/68">
                        {alert.description}
                      </p>
                    </article>
                  ))
                ) : (
                  <p className="text-sm text-white/58">No active NPS alerts are currently attached to this park.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
