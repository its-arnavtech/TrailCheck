import Image from "next/image";
import { notFound } from "next/navigation";
import PageNavbar from "@/components/page-navbar";
import ParkTrailsExplorer from "@/components/park-trails-explorer";
import { getPark } from "@/lib/api";
import { getParkVisual } from "@/lib/park-content";
export const revalidate = 300;
export default async function ParkTrailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const park = await getPark(slug);
  if (!park) notFound();
  const visual = await getParkVisual(slug, park.name);
  return (
    <main>
      <PageNavbar
        parkHref={`/parks/${slug}`}
        parkLabel={park.name}
        trailLabel="Trails"
      />
      <div className="section-shell detail-page">
        <section className="detail-hero detail-hero-small scenic-panel">
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
            <p className="hero-eyebrow">{park.state}</p>
            <h1 id="main-content" tabIndex={-1}>
              Trails in {park.name}.
            </h1>
            <p>Find the route that makes the day yours.</p>
          </div>
        </section>
        {park.offline && (
          <p className="availability-note">
            The trail directory is temporarily unavailable. Try again when live
            data reconnects.
          </p>
        )}
        <section className="detail-section">
          <ParkTrailsExplorer
            trails={park.trails}
            parkName={park.name}
            visualImageUrl={visual.imageUrl}
            mode="full"
          />
        </section>
      </div>
    </main>
  );
}
