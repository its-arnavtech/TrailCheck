import {
  buildGoogleMapsEmbedUrl,
  buildGoogleMapsExternalUrl,
} from "@/lib/google-maps";

type ParkMapCardProps = {
  parkName: string;
  state: string;
  latitude?: number | null;
  longitude?: number | null;
  formattedLocation?: string | null;
};

export default function ParkMapCard({
  parkName,
  state,
  latitude,
  longitude,
  formattedLocation,
}: ParkMapCardProps) {
  const embedUrl = buildGoogleMapsEmbedUrl({
    parkName,
    state,
    latitude,
    longitude,
    formattedLocation,
  });

  const externalUrl = buildGoogleMapsExternalUrl({
    parkName,
    state,
    latitude,
    longitude,
    formattedLocation,
  });

  const resolvedLocation = formattedLocation ?? state;

  return (
    <section className="glass-panel topo-ring rounded-[1.75rem] p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--accent-strong)]/75">
            Location
          </p>
          <h2 className="mt-2 text-3xl text-ink" data-display="true">
            Map
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink/64">
            Explore this park in Google Maps and jump out to the full map when
            you need turn-by-turn context.
          </p>
        </div>

        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-950/10 transition hover:brightness-105"
        >
          Open in Google Maps
        </a>
      </div>

      <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-ink/10 bg-ink/5">
        <div className="relative aspect-[4/3] min-h-[280px] w-full sm:aspect-[16/10]">
          <iframe
            title={`${parkName} map`}
            src={embedUrl}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-0 h-full w-full border-0"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm text-ink/72">
        <span className="rounded-full border border-ink/10 bg-[var(--surface-muted)] px-4 py-2">
          {resolvedLocation}
        </span>
        {typeof latitude === "number" && typeof longitude === "number" ? (
          <span className="rounded-full border border-ink/10 bg-[var(--surface-muted)] px-4 py-2">
            {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </span>
        ) : (
          <span className="rounded-full border border-ink/10 bg-[var(--surface-muted)] px-4 py-2">
            Using park name and state fallback
          </span>
        )}
      </div>
    </section>
  );
}
