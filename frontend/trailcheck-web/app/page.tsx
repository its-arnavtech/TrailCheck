import Image from 'next/image';
import HomeHeader from '@/components/home-header';
import Footer from '@/components/footer';
import ParkCard from '@/components/park-card';
import ParkMap from '@/components/park-map';
import ParksExplorer from '@/components/parks-explorer';
import SafetyDigest from '@/components/safety-digest';
import { getParkDigest, getParks } from '../lib/api';
import { getParkVisual, getParkVisualMap } from '../lib/park-content';
import trailcheckLogo from './trailcheck_logo-removebg-preview.png';

export const revalidate = 600;

const featuredSlugs = ['yosemite', 'zion', 'acadia'];

const featurePillars = [
  {
    title: 'AI safety digest',
    description: 'Risk summaries blend alerts, hazards, and forecast changes into a quick-read decision layer.',
  },
  {
    title: 'Live conditions',
    description: 'Track hazards, recent reports, and short-range weather without bouncing across sources.',
  },
  {
    title: 'Scannable route pages',
    description: 'Every trail page is structured for fast field reads, not walls of text.',
  },
  {
    title: 'Authenticated reporting',
    description: 'Protected submissions keep condition reports tied to real accounts and cleaner history.',
  },
];

export default async function Home() {
  const parks = await getParks();
  const heroVisual = await getParkVisual('yosemite', 'Yosemite');
  const parkVisuals = await getParkVisualMap(parks);
  const heroDigest = await getParkDigest('yosemite').catch(() => null);
  const featuredParks = featuredSlugs
    .map((slug) => parks.find((park) => park.slug === slug))
    .filter((park): park is NonNullable<(typeof parks)[number]> => Boolean(park));

  const featuredDigests = await Promise.all(
    featuredParks.map(async (park) => [park.slug, await getParkDigest(park.slug).catch(() => null)] as const),
  );

  const featuredDigestMap = Object.fromEntries(featuredDigests);
  const hasParks = parks.length > 0;

  return (
    <main className="relative min-h-screen overflow-hidden pb-10">
      <div className="absolute inset-0">
        <Image
          src={heroVisual.imageUrl}
          alt={heroVisual.imageAlt}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,9,13,0.44),rgba(4,10,14,0.6)_24%,rgba(4,10,14,0.92)_72%,rgba(4,10,14,1)_100%)]" />
      </div>

      <HomeHeader />

      <section className="section-shell relative z-10 pt-4 sm:pt-6 lg:pt-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.9fr)] lg:items-start">
          <div className="max-w-3xl">
            <div>
              <Image
                src={trailcheckLogo}
                alt="TrailCheck"
                priority
                className="h-auto w-[280px] max-w-full sm:w-[360px] lg:w-[420px]"
              />
            </div>
            <h1 className="mt-5 max-w-4xl text-5xl leading-[0.95] text-white sm:text-6xl xl:text-7xl" data-display="true">
              Read the mountain mood before you lace up.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/76 sm:text-lg">
              TrailCheck turns scattered park alerts, community signals, weather, and AI-generated safety insight into one calm, cinematic field dashboard.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href="#explore-parks"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6d8f80,#c8ddcf)] px-6 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-105"
              >
                Explore parks
              </a>
              <a
                href="#safety-digest"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/14 bg-white/6 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                See the digest
              </a>
            </div>
          </div>

          <div className="relative lg:pl-4 lg:pt-0">
            <ParkMap />
          </div>
        </div>
      </section>

      <section className="section-shell relative z-10 mt-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {featurePillars.map((feature) => (
            <article key={feature.title} className="py-2">
              <h2 className="text-2xl text-white" data-display="true">
                {feature.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-white/70">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="safety-digest" className="section-shell relative z-10 mt-14">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--accent-strong)]/64">
              Safety Digest
            </p>
            <h2 className="mt-3 text-4xl text-white sm:text-5xl" data-display="true">
              A calmer read on park risk.
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-white/66 sm:text-base">
            The digest showcases how TrailCheck explains risk without drowning visitors in tabs, feeds, or unstructured alerts.
          </p>
        </div>
        <SafetyDigest digest={heroDigest} parkName="Yosemite" />
      </section>

      <section id="featured-parks" className="section-shell relative z-10 mt-14">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--accent-strong)]/64">
              Featured Parks
            </p>
            <h2 className="mt-3 text-4xl text-white sm:text-5xl" data-display="true">
              Spotlighted destinations with live context.
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-white/66 sm:text-base">
            Featured parks surface the kind of high-signal experience the full catalog is moving toward.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {featuredParks.map((park) => (
            <ParkCard
              key={park.slug}
              park={park}
              visual={parkVisuals[park.slug]}
              digest={featuredDigestMap[park.slug]}
              featured
            />
          ))}
        </div>
      </section>

      <section
        id="explore-parks"
        className="section-shell relative z-10 mt-14"
      >
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--accent-strong)]/64">
              Explore
            </p>
            <h2 className="mt-3 text-4xl text-white sm:text-5xl" data-display="true">
              National parks in the TrailCheck network.
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-white/66 sm:text-base">
            {hasParks
              ? 'Use search to jump to a park, then drill into AI digest, hazards, weather, and trail pages.'
              : 'Park data is temporarily unavailable, but the app shell is ready to reconnect.'}
          </p>
        </div>

        <ParksExplorer parks={parks} visuals={parkVisuals} />
      </section>

      <Footer />
    </main>
  );
}
