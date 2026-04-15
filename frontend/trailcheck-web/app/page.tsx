import Image from 'next/image';
import HomeHeader from '@/components/home-header';
import ParkMap from '@/components/park-map';
import ParksExplorer from '@/components/parks-explorer';
import { getParks } from '../lib/api';
import { getParkVisual, getParkVisualMap } from '../lib/park-content';
import trailcheckLogo from './trailcheck_logo-removebg-preview.png';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const parks = await getParks();
  const heroVisual = await getParkVisual('yosemite', 'Yosemite');
  const parkVisuals = await getParkVisualMap(parks);
  const hasParks = parks.length > 0;

  return (
    <main className="relative flex min-h-screen w-full flex-col gap-0 overflow-hidden pb-6 sm:pb-8 lg:pb-10">
      <img
        src={heroVisual.imageUrl}
        alt={heroVisual.imageAlt}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,26,34,0.52)_0%,rgba(18,26,34,0.44)_28%,rgba(18,26,34,0.34)_56%,rgba(219,224,230,0.78)_100%)]" />
      <HomeHeader />
      <section className="relative min-h-screen overflow-hidden">
        <div className="absolute -left-16 top-8 h-40 w-40 rounded-full bg-white/30 blur-3xl sm:h-52 sm:w-52" />
        <div className="absolute -right-16 top-6 h-44 w-44 rounded-full bg-white/22 blur-3xl sm:h-56 sm:w-56" />
        <div className="absolute -left-10 bottom-6 h-32 w-32 rounded-full bg-white/18 blur-3xl sm:h-40 sm:w-40" />
        <div className="relative px-8 py-6 sm:px-10 sm:py-8 lg:px-12">
          <div className="flex min-h-[calc(100vh-8rem)] flex-col justify-center gap-10">
            <div className="flex flex-col gap-8 text-white lg:flex-row lg:items-center lg:justify-between xl:gap-10">
              <div className="flex flex-col items-center gap-6 lg:max-w-[28rem] lg:items-start lg:gap-8">
                <Image
                  src={trailcheckLogo}
                  alt="TrailCheck"
                  priority
                  className="h-auto w-[280px] max-w-full sm:w-[360px] lg:w-[420px]"
                />
                <a
                  href="#explore-parks"
                  className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/18 px-8 py-4 text-center text-lg font-semibold text-white shadow-[0_20px_40px_rgba(10,18,26,0.22)] backdrop-blur-md transition hover:bg-white/28"
                >
                  {hasParks
                    ? 'Explore the breathtaking trails our National Parks have to offer'
                    : 'Browse TrailCheck while live park data reconnects'}
                </a>
                <p className="text-sm font-medium tracking-[0.01em] text-white/84 sm:text-base">
                  {hasParks
                    ? `Explore Trails across all ${parks.length} U.S. National Park${parks.length === 1 ? '' : 's'} on the TrailCheck network.`
                    : 'Live park listings are temporarily unavailable, but you can still explore the TrailCheck experience.'}
                </p>
              </div>
              <ParkMap />
            </div>
          </div>
        </div>
      </section>

      <section
        id="explore-parks"
        className="relative mx-auto w-full max-w-[min(100%,1440px)] space-y-4 px-4 pt-8 sm:px-6 sm:pt-10 lg:px-8 xl:px-10"
      >
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
            {hasParks
              ? 'Choose a park to browse its trails.'
              : 'Will be available soon'}
          </p>
        </div>

        <ParksExplorer parks={parks} visuals={parkVisuals} />
      </section>

      <footer className="relative mt-12 w-full border-t border-white/14 bg-[rgba(15,23,32,0.72)] px-6 py-10 text-white backdrop-blur-md sm:px-8 lg:px-12">
        <div className="mx-auto flex w-full max-w-[min(100%,1440px)] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-white/64">
              Contact
            </p>
            <p className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
              Have questions? Contact us.
            </p>
          </div>
          <p className="text-sm text-white/72">
            its.arnavk.here@gmail.com
          </p>
        </div>
      </footer>
    </main>
  );
}
