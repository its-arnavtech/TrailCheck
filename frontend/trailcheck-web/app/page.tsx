import Image from "next/image";
import Link from "next/link";
import HomeHeader from "@/components/home-header";
import ParkCard from "@/components/park-card";
import ParksExplorer from "@/components/parks-explorer";
import LazyParkMap from "@/components/lazy-park-map";
import Icon from "@/components/ui-icon";
import { getParks } from "@/lib/api";
import { PARK_CATALOG } from "@/lib/park-catalog";
import { getParkVisualMap } from "@/lib/park-content";
export const revalidate = 600;
export default async function Home() {
  const parks = await getParks();
  const available = parks.length > 0;
  const catalog = available
    ? parks
    : PARK_CATALOG.map((park) => ({ ...park, trails: [] }));
  const visuals = await getParkVisualMap(catalog);
  const featured = ["yosemite", "zion", "acadia"]
    .map((slug) => catalog.find((park) => park.slug === slug))
    .filter((park) => !!park);
  return (
    <main className="home-page">
      <HomeHeader />
      <section className="hero scenic-panel">
        <Image
          src="/images/yosemite-inspired-hero.webp"
          alt="Photorealistic artwork inspired by Yosemite Valley, with granite cliffs and a forested valley."
          fill
          preload
          sizes="100vw"
          className="hero-image"
        />
        <div className="hero-shade" />
        <div className="section-shell hero-content">
          <p className="hero-eyebrow">
            <span /> A little closer to the wild
          </p>
          <h1 id="main-content" tabIndex={-1}>
            Your next adventure.
            <br />
            <em>A little more informed.</em>
          </h1>
          <p className="hero-description">
            Find your park. Know the conditions.
            <br />
            Spend more time where you belong.
          </p>
          <a href="#explore-parks" className="button button-cream">
            Find your next trail <Icon name="arrow" size={18} />
          </a>
        </div>
        <div className="section-shell hero-bottom">
          <span>
            <Icon name="compass" size={15} /> Yosemite Valley · Inspired scenery
          </span>
          <span>Explore with curiosity. Go with confidence.</span>
        </div>
      </section>
      <div className="trust-strip section-shell">
        <span>
          <Icon name="mountain" /> {PARK_CATALOG.length} national parks
        </span>
        <span>
          <Icon name="weather" /> Weather & park alerts
        </span>
        <span>
          <Icon name="shield" /> Clearer safety insights
        </span>
        <span className="trust-note">Good days outside start here.</span>
      </div>
      <section id="featured-parks" className="section-shell editorial-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Places that stay with you</p>
            <h2>A few favorites to get you going.</h2>
          </div>
          <a href="#explore-parks" className="text-link">
            Explore all parks <Icon name="arrow" size={17} />
          </a>
        </div>
        <div className="featured-grid">
          {featured.map((park) => (
            <ParkCard
              key={park.slug}
              park={park}
              visual={visuals[park.slug]}
              featured
              available={available}
            />
          ))}
        </div>
      </section>
      <section id="safety-digest" className="section-shell editorial-section">
        <div className="planning-banner">
          <div>
            <p className="eyebrow">Before the boots hit the trail</p>
            <h2>
              Wonder more.
              <br />
              <em>Worry a little less.</em>
            </h2>
            <p>
              A beautiful view is only part of the story. Get the weather, park
              alerts, and community reports together, so you can plan the day
              ahead.
            </p>
            <Link href="/parks/yosemite" className="button button-forest">
              See park conditions <Icon name="arrow" size={18} />
            </Link>
          </div>
          <div className="planning-steps">
            {[
              {
                icon: "compass" as const,
                title: "Find your kind of outside",
                text: "From quiet coastlines to towering granite. Search the whole national park directory.",
              },
              {
                icon: "shield" as const,
                title: "Get the full picture",
                text: "Read available alerts, forecasts, and a concise safety digest before you go.",
              },
              {
                icon: "heart" as const,
                title: "Keep the good places close",
                text: "Save favorites, build your wish list, and share what you find on the trail.",
              },
            ].map((step, index) => (
              <div className="planning-step" key={step.title}>
                <span className="step-icon">
                  <Icon name={step.icon} size={23} />
                </span>
                <div>
                  <span className="step-number">0{index + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section id="explore-parks" className="section-shell editorial-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Your next chapter starts outside</p>
            <h2>So many places. Your kind of adventure.</h2>
          </div>
          <p className="section-description">
            Discover the national parks,
            <br />
            one extraordinary place at a time.
          </p>
        </div>
        <ParksExplorer
          parks={catalog}
          visuals={visuals}
          available={available}
        />
      </section>
      <section id="park-map" className="section-shell editorial-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Follow your curiosity</p>
            <h2>A whole country of possibilities.</h2>
          </div>
          <p className="section-description">Choose a pin to explore a park.</p>
        </div>
        <div className="map-stage">
          <LazyParkMap />
        </div>
      </section>
      <section className="section-shell closing-note">
        <Icon name="mountain" size={34} />
        <h2>
          Leave the scroll.
          <br />
          <em>Find the trail.</em>
        </h2>
        <a href="#explore-parks" className="text-link">
          Let’s get outside <Icon name="arrow" size={17} />
        </a>
      </section>
    </main>
  );
}
