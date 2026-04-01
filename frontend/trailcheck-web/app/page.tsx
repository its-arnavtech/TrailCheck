import Image from 'next/image';
import AuthPanel from '@/components/auth-panel';
import ParksExplorer from '@/components/parks-explorer';
import { getParks } from '../lib/api';
import { getParkVisual, getParkVisualMap } from '../lib/park-content';
import trailcheckLogo from './trailcheck_logo-removebg-preview.png';

export default async function Home() {
  const parks = await getParks();
  const heroVisual = await getParkVisual('yosemite', 'Yosemite');
  const parkVisuals = await getParkVisualMap(parks);
  const trailCount = parks.reduce((count, park) => count + park.trails.length, 0);

  return (
    <main className="flex min-h-screen w-full flex-col gap-0 pb-6 sm:pb-8 lg:pb-10">
      <section className="relative min-h-[320px] overflow-hidden">
        <img
          src={heroVisual.imageUrl}
          alt={heroVisual.imageAlt}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(22,34,42,0.58)_0%,rgba(22,34,42,0.34)_48%,rgba(22,34,42,0.18)_100%)]" />
        <div className="absolute -left-16 top-8 h-40 w-40 rounded-full bg-white/30 blur-3xl sm:h-52 sm:w-52" />
        <div className="absolute -right-16 top-6 h-44 w-44 rounded-full bg-white/22 blur-3xl sm:h-56 sm:w-56" />
        <div className="absolute -left-10 bottom-6 h-32 w-32 rounded-full bg-white/18 blur-3xl sm:h-40 sm:w-40" />
        <div className="relative px-8 py-10 sm:px-10 sm:py-12 lg:px-12">
          <div className="flex min-h-[320px] flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-5xl text-white">
              <div className="flex items-center">
                <Image
                  src={trailcheckLogo}
                  alt="TrailCheck"
                  priority
                  className="h-auto w-[280px] max-w-full sm:w-[360px] lg:w-[420px]"
                />
              </div>
              <p className="mt-6 max-w-4xl text-xl leading-relaxed text-white/95 sm:text-2xl">
                Report trail hazards and help keep our national parks safe for everyone.
              </p>
              <p className="mt-5 text-sm font-medium tracking-[0.01em] text-white/84 sm:text-base">
                Explore {trailCount} trail{trailCount === 1 ? '' : 's'} across {parks.length} park{parks.length === 1 ? '' : 's'} on the TrailCheck network.
              </p>
            </div>
            <div className="w-full max-w-md">
              <AuthPanel />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[min(100%,1440px)] space-y-4 px-4 pt-8 sm:px-6 sm:pt-10 lg:px-8 xl:px-10">
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

        <ParksExplorer parks={parks} visuals={parkVisuals} />
      </section>
    </main>
  );
}
