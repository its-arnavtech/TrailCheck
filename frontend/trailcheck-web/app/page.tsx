import Link from 'next/link';
import { getParks } from '../lib/api';

export default async function Home() {
  const parks = await getParks();
  const trailCount = parks.reduce((count, park) => count + park.trails.length, 0);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-5 py-8 sm:px-8 lg:px-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[linear-gradient(135deg,var(--hero-start),var(--hero-end))] px-6 py-8 shadow-[var(--shadow-soft)] sm:px-10 sm:py-12">
        <div className="absolute -right-8 top-0 h-40 w-40 rounded-full bg-white/35 blur-2xl" />
        <div className="absolute bottom-0 left-0 h-32 w-32 -translate-x-8 translate-y-8 rounded-full bg-emerald-200/50 blur-2xl" />
        <div className="relative max-w-3xl">
          <p className="mb-3 inline-flex rounded-full border border-white/60 bg-white/45 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-950/80 backdrop-blur">
            Trail conditions at a glance
          </p>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-blue-950 sm:text-5xl">
            TrailCheck makes current trail conditions easier to scan.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-emerald-950/75 sm:text-base">
            Browse trails, check park context, and jump into reports without changing anything about the current workflow.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-emerald-950/80">
            <div className="rounded-full border border-white/65 bg-white/45 px-4 py-2 backdrop-blur">
              {parks.length} park{parks.length === 1 ? '' : 's'}
            </div>
            <div className="rounded-full border border-white/65 bg-white/45 px-4 py-2 backdrop-blur">
              {trailCount} trail{trailCount === 1 ? '' : 's'} across all parks
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--accent-strong)]/75">
              Explore
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
              National parks
            </h2>
          </div>
          <p className="text-sm text-[var(--foreground)]/60">
            Choose a park to browse its trails.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {parks.map((park) => (
            <Link key={park.slug} href={`/parks/${park.slug}`} className="group">
              <article className="h-full rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)] backdrop-blur transition duration-200 hover:-translate-y-1 hover:border-[var(--accent)]/35 hover:bg-[var(--surface-strong)]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-strong)]">
                    Park
                  </span>
                  <span className="text-sm text-[var(--foreground)]/45 transition group-hover:text-[var(--accent-strong)]">
                    Browse trails
                  </span>
                </div>
                <h3 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
                  {park.name}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--foreground)]/68">
                  {park.trails.length} available trail{park.trails.length === 1 ? '' : 's'}
                </p>
              </article>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
