import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageNavbar from "@/components/page-navbar";
import SafetyDigest from "@/components/safety-digest";
import ParkMapCard from "@/components/park-map-card";
import ParkPreferenceActions from "@/components/park-preference-actions";
import ParkTrailsExplorer from "@/components/park-trails-explorer";
import ParkReportPanel from "@/components/park-report-panel";
import ReportAuthCta from "@/components/report-auth-cta";
import Icon from "@/components/ui-icon";
import { getPark, getParkDigest } from "@/lib/api";
import { getParkVisual } from "@/lib/park-content";
import { getParkCoordinates } from "@/lib/park-globe-data";
export const revalidate = 300;
export default async function ParkPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const park = await getPark(slug);
  if (!park) notFound();
  const [visual, digest] = await Promise.all([
    getParkVisual(park.slug, park.name),
    park.offline
      ? Promise.resolve(null)
      : getParkDigest(park.slug).catch(() => null),
  ]);
  const coordinates = getParkCoordinates(park.slug);
  return (
    <main>
      <PageNavbar parkHref={`/parks/${park.slug}`} parkLabel={park.name} />
      <div className="section-shell detail-page">
        <section className="detail-hero scenic-panel">
          <Image
            src={visual.imageUrl}
            alt={visual.imageAlt}
            fill
            preload
            sizes="100vw"
            className="object-cover"
          />
          <div className="detail-hero-shade" />
          <div className="detail-hero-content">
            <p className="hero-eyebrow">{park.state} · National park</p>
            <h1 id="main-content" tabIndex={-1}>
              {park.name}
            </h1>
            <p>{visual.tagline}</p>
            <a href="#park-trails" className="button button-cream">
              Find a trail <Icon name="arrow" size={17} />
            </a>
          </div>
          {visual.credit && (
            <a
              className="photo-credit"
              href={visual.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {visual.credit}
            </a>
          )}
        </section>
        <div className="park-detail-bar">
          <span>
            <Icon name="compass" size={18} />
            {park.state}
          </span>
          <ParkPreferenceActions parkSlug={park.slug} parkName={park.name} />
        </div>
        {park.offline && (
          <p className="availability-note">
            Live conditions and trail details are temporarily offline. You can
            still explore this park’s location and photographs.
          </p>
        )}
        <SafetyDigest digest={digest} parkName={park.name} />
        <section id="park-trails" className="detail-section">
          <ParkTrailsExplorer
            trails={park.trails}
            parkName={park.name}
            visualImageUrl={visual.imageUrl}
          />
          {park.trails.length > 0 && (
            <Link
              className="button button-outline mt-6"
              href={`/parks/${park.slug}/trails`}
            >
              Browse all {park.trails.length} trails{" "}
              <Icon name="arrow" size={17} />
            </Link>
          )}
        </section>
        <div className="detail-columns">
          <ParkMapCard
            parkName={park.name}
            state={park.state}
            latitude={coordinates?.lat}
            longitude={coordinates?.lng}
          />
          <section className="conditions-card">
            <p className="eyebrow">From one explorer to the next</p>
            <h2>Share what you found.</h2>
            <p className="detail-description">
              A quick note about mud, snow, closures, or crowding helps the next
              person plan a better day.
            </p>
            <ReportAuthCta />
            <div className="mt-6">
              <ParkReportPanel trails={park.trails} flush />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
