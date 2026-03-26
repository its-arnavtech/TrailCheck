import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPark } from '@/lib/api';

type ParkPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ParkPage({ params }: ParkPageProps) {
  const { slug } = await params;
  const park = await getPark(slug);

  if (!park) notFound();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10">
      <section className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[linear-gradient(145deg,var(--hero-start),color-mix(in_srgb,var(--hero-end)_72%,white_28%))] p-6 shadow-[var(--shadow-soft)] sm:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--accent-strong)]/70">
          Park trails
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-emerald-950 sm:text-4xl">
          {park.name}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-emerald-950/78 sm:text-base">
          Pick a trail to view its latest reports, hazards, weather, and park alerts.
        </p>
        <div className="mt-5 flex flex-wrap gap-3 text-sm text-emerald-950/80">
          <div className="rounded-full border border-white/65 bg-white/45 px-4 py-2 backdrop-blur">
            {park.trails.length} trail{park.trails.length === 1 ? '' : 's'} in this park
          </div>
          <Link
            href="/"
            className="rounded-full border border-white/65 bg-white/45 px-4 py-2 backdrop-blur transition hover:bg-white/70"
          >
            Back to parks
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--accent-strong)]/75">
            Trails
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
            Available routes
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {park.trails.map((trail) => (
            <Link key={trail.id} href={`/trails/${trail.id}`} className="group">
              <article className="h-full rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)] backdrop-blur transition duration-200 hover:-translate-y-1 hover:border-[var(--accent)]/35 hover:bg-[var(--surface-strong)]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-strong)]">
                    Trail
                  </span>
                  <span className="text-sm text-[var(--foreground)]/45 transition group-hover:text-[var(--accent-strong)]">
                    View conditions
                  </span>
                </div>
                <h3 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
                  {trail.name}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--foreground)]/68">
                  Open the trail page for reports and current conditions.
                </p>
              </article>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
