import type { WeatherPeriod } from "@/lib/api";
import Icon from "@/components/ui-icon";
export default function WeatherCard({
  period,
  expanded = false,
}: {
  period: WeatherPeriod;
  expanded?: boolean;
}) {
  return (
    <article className="weather-card">
      <div>
        <span>{period.name}</span>
        <Icon name="weather" size={22} />
      </div>
      <strong>
        {period.temperature}°<small>{period.temperatureUnit}</small>
      </strong>
      <p>{period.shortForecast}</p>
      <span className="weather-wind">Wind {period.windSpeed}</span>
      {expanded && <p>{period.detailedForecast}</p>}
    </article>
  );
}
