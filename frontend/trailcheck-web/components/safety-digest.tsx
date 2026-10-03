import type { ParkDigest } from "@/lib/api";
import RiskBadge from "@/components/risk-badge";
import WeatherCard from "@/components/weather-card";
import Icon from "@/components/ui-icon";
import {
  getDigestRiskLevel,
  getGenerationSourceLabel,
} from "@/lib/digest-display";
type Props = {
  digest: ParkDigest | null;
  parkName?: string;
  compact?: boolean;
};
export default function SafetyDigest({
  digest,
  parkName,
  compact = false,
}: Props) {
  const weather = digest?.weather?.forecast ?? [];
  const hazards = digest?.hazards ?? [];
  const alerts = digest?.alerts ?? [];
  const missingAlerts = digest?.dataAvailability?.alerts === false;
  const missingWeather = digest?.dataAvailability?.weather === false;
  const noLiveData = missingAlerts && missingWeather;
  return (
    <section className="conditions-card">
      <div className="conditions-heading">
        <div>
          <p className="eyebrow">Know before you go</p>
          <h2>
            {parkName ? `${parkName} at a glance` : "Your safety readout"}
          </h2>
        </div>
        <RiskBadge level={getDigestRiskLevel(digest)} />
      </div>
      {digest && (missingAlerts || missingWeather) && (
        <div className="availability-note" role="status">
          <p>
            {noLiveData
              ? "Live conditions are unavailable. The information below is seasonal planning context."
              : `${missingAlerts ? "Park alerts" : "Weather"} are unavailable right now.`}{" "}
            Check official park information before traveling.
          </p>
        </div>
      )}
      {digest ? (
        <>
          {!noLiveData && (
            <p className="conditions-notification">{digest.notification}</p>
          )}
          <div className="conditions-summary">
            <Icon name="shield" size={23} />
            <div>
              <h3>
                {noLiveData
                  ? "Seasonal planning context"
                  : "The current picture"}
              </h3>
              <p>
                {noLiveData
                  ? "Weather and park bulletins could not be retrieved. Review seasonal hazards below and confirm current conditions with the park."
                  : digest.shortSummary}
              </p>
              {digest.structuredOutput?.recommendedAction && (
                <p className="conditions-recommendation">
                  {digest.structuredOutput.recommendedAction}
                </p>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="availability-note" role="status">
          <h3>Live conditions are unavailable.</h3>
          <p>
            Check the park’s official alerts before you travel. We’ll show the
            latest information when the connection returns.
          </p>
        </div>
      )}
      <div className="condition-metrics">
        <div>
          <span>Park hazards</span>
          <strong>{digest ? hazards.length : "—"}</strong>
          <small>{digest ? "Highlighted signals" : "Unavailable"}</small>
        </div>
        <div>
          <span>Park alerts</span>
          <strong>{digest && !missingAlerts ? alerts.length : "—"}</strong>
          <small>
            {digest && !missingAlerts ? "NPS bulletin feed" : "Unavailable"}
          </small>
        </div>
        <div>
          <span>Summary source</span>
          <strong className="source-name">
            {getGenerationSourceLabel(digest?.generationSource)}
          </strong>
          <small>Safety digest</small>
        </div>
      </div>
      {digest && hazards.length > 0 && (
        <div className="signal-grid">
          {hazards.slice(0, compact ? 4 : 6).map((hazard) => (
            <article key={hazard.id}>
              <RiskBadge level={hazard.severity} subtle />
              <h3>{hazard.title}</h3>
              <p>{hazard.summary}</p>
            </article>
          ))}
        </div>
      )}
      {digest && alerts.length > 0 && (
        <div className="signal-grid">
          {alerts.slice(0, 3).map((alert) => (
            <article key={alert.id}>
              <p className="eyebrow">{alert.category}</p>
              <h3>{alert.title}</h3>
              <p>{alert.description}</p>
              {alert.url && (
                <a
                  href={alert.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-link"
                >
                  Read official alert <Icon name="arrow" size={14} />
                </a>
              )}
            </article>
          ))}
        </div>
      )}
      {!compact && weather.length > 0 && (
        <div className="weather-grid">
          {weather.slice(0, 4).map((period) => (
            <WeatherCard key={period.name} period={period} />
          ))}
        </div>
      )}
    </section>
  );
}
