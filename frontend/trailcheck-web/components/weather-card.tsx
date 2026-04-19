import Image from 'next/image';
import type { WeatherPeriod } from '@/lib/api';

type WeatherCardProps = {
  period: WeatherPeriod;
  expanded?: boolean;
};

export default function WeatherCard({ period, expanded = false }: WeatherCardProps) {
  return (
    <article className="topo-ring overflow-hidden rounded-[1.25rem] border border-sky-200/18 bg-[linear-gradient(180deg,rgba(38,76,94,0.52),rgba(13,31,40,0.84))] p-4 shadow-[0_14px_32px_rgba(2,12,18,0.24)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-sky-50">{period.name}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-sky-100/60">
            {period.windSpeed}
          </p>
        </div>
        <Image
          src={period.icon}
          alt={period.shortForecast}
          width={48}
          height={48}
          className="h-12 w-12 object-contain"
          loading="lazy"
        />
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="text-3xl font-semibold text-white">
          {period.temperature}&deg;{period.temperatureUnit}
        </p>
        <p className="max-w-[12rem] text-right text-sm text-sky-50/72">
          {period.shortForecast}
        </p>
      </div>
      {expanded ? (
        <p className="mt-3 text-sm leading-6 text-sky-50/72">{period.detailedForecast}</p>
      ) : null}
    </article>
  );
}
