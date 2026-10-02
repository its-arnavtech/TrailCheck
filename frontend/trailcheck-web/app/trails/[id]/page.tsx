import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import NavBar from "@/components/navbar";
import ReportAuthCta from "@/components/report-auth-cta";
import ReportCard from "@/components/report-card";
import ReportForm from "@/components/reportform";
import RiskBadge from "@/components/risk-badge";
import WeatherCard from "@/components/weather-card";
import Icon from "@/components/ui-icon";
import { getTrail } from "@/lib/api";
import { getParkVisual } from "@/lib/park-content";
import { getTrailRisk } from "@/lib/trail-display";

type Props = { params: Promise<{ id: string }> };
const statusCopy: Record<string, string> = {
  OPEN: "Route listed as open",
  CAUTION: "Proceed with elevated caution",
  CLOSED: "Route listed as closed",
};
export default async function TrailPage({ params }: Props) {
  const { id } = await params;
  const trail = await getTrail(id);
  if (!trail) notFound();
  const visual = trail.park
    ? await getParkVisual(trail.park.slug, trail.park.name)
    : null;
  const available = trail.dataAvailability;
  const hazards = (trail.hazards ?? []).filter((hazard) => hazard.isActive);
  const forecast = trail.weather?.forecast.slice(0, 4) ?? [];
  const routeStatus =
    available?.hazards === false ? "UNKNOWN" : (trail.status ?? "UNKNOWN");
  return (
    <main>
      <NavBar
        parkHref={trail.park ? `/parks/${trail.park.slug}` : undefined}
        parkLabel={trail.park?.name}
        trailLabel={trail.name}
      />
      <div className="section-shell detail-page">
        <section className="detail-hero scenic-panel">
          {visual && (
            <Image
              src={visual.imageUrl}
              alt={`Park landscape: ${visual.imageAlt}`}
              fill
              preload
              sizes="(max-width: 1224px) 100vw, 1224px"
              className="object-cover"
            />
          )}
          <div className="detail-hero-shade" />
          <div className="detail-hero-content">
            <p className="hero-eyebrow">
              {trail.park?.name ?? "Your next adventure"} · Trail guide
            </p>
            <h1 id="main-content" tabIndex={-1}>
              {trail.name}
            </h1>
            <p>
              {trail.description ??
                "A place to stretch your legs, find a new perspective, and spend a little more time outside."}
            </p>
            <div className="trail-hero-facts">
              {trail.lengthMiles != null && (
                <span>{trail.lengthMiles} miles</span>
              )}
              {trail.difficulty && (
                <span>{trail.difficulty.toLowerCase()}</span>
              )}
              <span>Park landscape shown</span>
            </div>
          </div>
          {visual?.credit && (
            <a
              className="photo-credit"
              href={visual.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {visual.credit}
            </a>
          )}
        </section>
        <div className="park-detail-bar">
          <span>
            <Icon name="compass" size={17} />A little planning goes a long way.
          </span>
          {trail.park && (
            <Link
              href={`/parks/${trail.park.slug}/trails`}
              className="text-link"
            >
              More trails in {trail.park.name}
              <Icon name="arrow" size={16} />
            </Link>
          )}
        </div>
        <section className="conditions-card">
          <div className="conditions-heading">
            <div>
              <p className="eyebrow">Before you set out</p>
              <h2>The trail, at a glance.</h2>
            </div>
            <RiskBadge level={getTrailRisk(trail)} />
          </div>
          <p className="conditions-notification">
            {routeStatus === "UNKNOWN"
              ? "Current route status is unavailable. Check official park information before setting out."
              : (statusCopy[routeStatus] ?? routeStatus)}
          </p>
          <div className="condition-metrics">
            <div>
              <span>Route status</span>
              <strong className="source-name">
                {routeStatus === "UNKNOWN"
                  ? "Unavailable"
                  : routeStatus.toLowerCase()}
              </strong>
              <small>Confirm with the park</small>
            </div>
            <div>
              <span>Active hazards</span>
              <strong>
                {available?.hazards === false ? "—" : hazards.length}
              </strong>
              <small>
                {available?.hazards === false
                  ? "Feed unavailable"
                  : "Recorded trail hazards"}
              </small>
            </div>
            <div>
              <span>Recent reports</span>
              <strong>
                {available?.reports === false
                  ? "—"
                  : (trail.reports?.length ?? 0)}
              </strong>
              <small>
                {available?.reports === false
                  ? "Feed unavailable"
                  : "Community check-ins"}
              </small>
            </div>
          </div>
          {trail.park && (
            <Link
              href={`/parks/${trail.park.slug}#conditions`}
              className="text-link"
            >
              See the full park safety digest
              <Icon name="arrow" size={16} />
            </Link>
          )}
        </section>
        <section className="conditions-card">
          <div className="conditions-heading">
            <div>
              <p className="eyebrow">A look at the sky</p>
              <h2>The forecast ahead.</h2>
            </div>
            <Icon name="weather" size={26} />
          </div>
          {forecast.length ? (
            <div className="weather-grid">
              {forecast.map((period) => (
                <WeatherCard key={period.name} period={period} />
              ))}
            </div>
          ) : (
            <p className="detail-description">
              Weather is unavailable right now. Check the local forecast before
              leaving.
            </p>
          )}
        </section>
        <div className="detail-columns">
          <section className="conditions-card">
            <div className="conditions-heading">
              <h2>Trail hazards.</h2>
              <Icon name="shield" size={24} />
            </div>
            {hazards.length ? (
              <div className="signal-grid trail-signal-grid">
                {hazards.map((hazard) => (
                  <article key={hazard.id}>
                    <RiskBadge
                      level={hazard.severity}
                      label={hazard.type}
                      subtle
                    />
                    <h3>{hazard.title}</h3>
                    {hazard.description && <p>{hazard.description}</p>}
                  </article>
                ))}
              </div>
            ) : (
              <p className="detail-description">
                {available?.hazards === false
                  ? "The hazard feed is unavailable. An empty list does not establish safe conditions."
                  : "No active hazards are recorded here. Conditions can change; consult the park before your trip."}
              </p>
            )}
          </section>
          <section className="conditions-card">
            <div className="conditions-heading">
              <h2>Park alerts.</h2>
              <span className="eyebrow">NPS</span>
            </div>
            {trail.npsAlerts?.length ? (
              <div className="signal-grid trail-signal-grid">
                {trail.npsAlerts.map((alert) => (
                  <article key={alert.id}>
                    <p className="eyebrow">{alert.category}</p>
                    <h3>{alert.title}</h3>
                    <p>{alert.description}</p>
                    {alert.url && (
                      <a
                        className="text-link"
                        href={alert.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Read the official alert
                        <Icon name="arrow" size={14} />
                      </a>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className="detail-description">
                {available?.alerts === false
                  ? "The official alert feed is unavailable. Visit the park website for current notices."
                  : "No alerts are currently returned by the park feed."}
              </p>
            )}
          </section>
        </div>
        <div className="detail-columns detail-section">
          <section className="conditions-card">
            <p className="eyebrow">Leave a little knowledge behind</p>
            <h2>How was the trail?</h2>
            <p className="detail-description">
              A quick update on the surface and conditions helps the next person
              plan their day.
            </p>
            <ReportAuthCta />
            <div className="mt-6">
              <ReportForm trailId={trail.id} />
            </div>
          </section>
          <section className="conditions-card">
            <p className="eyebrow">From the community</p>
            <h2>Recent check-ins.</h2>
            <div className="mt-6 space-y-4">
              {trail.reports?.length ? (
                trail.reports.map((report) => (
                  <ReportCard key={report.id} report={report} />
                ))
              ) : (
                <p className="detail-description">
                  {available?.reports === false
                    ? "Community reports are unavailable right now."
                    : "No check-ins yet. Be the first to share what you found."}
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
