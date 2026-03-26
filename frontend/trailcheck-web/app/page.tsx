import Link from 'next/link';
import { getParks } from '../lib/api';
import { getParkVisual } from '../lib/park-content';

export default async function Home() {
  const parks = await getParks();
  const trailCount = parks.reduce((count, park) => count + park.trails.length, 0);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[min(100%,1440px)] flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[linear-gradient(135deg,var(--hero-start),var(--hero-end))] px-6 py-8 shadow-[var(--shadow-soft)] sm:px-10 sm:py-12">
        <div className="absolute -right-8 top-0 h-40 w-40 rounded-full bg-white/35 blur-2xl" />
        <div className="absolute bottom-0 left-0 h-32 w-32 -translate-x-8 translate-y-8 rounded-full bg-slate-200/60 blur-2xl" />
        <div className="relative max-w-3xl">
          <p className="mb-3 inline-flex rounded-full border border-white/50 bg-white/38 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-800/85 backdrop-blur">
            Trail conditions at a glance
          </p>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-pink-900 sm:text-5xl">
            Welcome to TrailCheck! Your next hiking trip made more informed.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-cyan-700/88 sm:text-base">
            Browse trails, check park context, and jump into reports without changing anything about the current workflow.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-800/85">
            <div className="rounded-full border border-white/55 bg-white/40 px-4 py-2 backdrop-blur">
              {parks.length} park{parks.length === 1 ? '' : 's'}
            </div>
            <div className="rounded-full border border-white/55 bg-white/40 px-4 py-2 backdrop-blur">
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

        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {parks.map((park) => (
            <Link key={park.slug} href={`/parks/${park.slug}`} className="group">
              <article className="h-full overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)] backdrop-blur transition duration-200 hover:-translate-y-1 hover:border-[var(--accent)]/35 hover:bg-[var(--surface-strong)]">
                <div className="relative h-52 overflow-hidden">
                  <img
                    src={getParkVisual(park.slug).imageUrl}
                    alt={getParkVisual(park.slug).imageAlt}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/78 via-slate-900/18 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/78">
                      {getParkVisual(park.slug).eyebrow}
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight">
                      {park.name}
                    </h3>
                  </div>
                </div>
                <div className="p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-strong)]">
                      Park
                    </span>
                    <span className="text-sm text-[var(--foreground)]/45 transition group-hover:text-[var(--accent-strong)]">
                      Browse trails
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-[var(--foreground)]/68">
                    {getParkVisual(park.slug).tagline}
                  </p>
                  <p className="mt-3 text-sm font-medium text-[var(--accent-strong)]">
                    {park.trails.length} available trail{park.trails.length === 1 ? '' : 's'}
                  </p>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
