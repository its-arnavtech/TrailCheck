import Image from "next/image";
import Link from "next/link";
import type { ParkDigest, ParkSummary } from "@/lib/api";
import type { ParkVisual } from "@/lib/park-content";
import ParkFavoriteButton from "@/components/park-favorite-button";
import Icon from "@/components/ui-icon";
type Props = {
  park: ParkSummary;
  visual: ParkVisual;
  digest?: ParkDigest | null;
  featured?: boolean;
  available?: boolean;
};
export default function ParkCard({
  park,
  visual,
  featured = false,
  available = true,
}: Props) {
  return (
    <article className={`park-card ${featured ? "park-card-featured" : ""}`}>
      <Link href={`/parks/${park.slug}`} className="park-card-link">
        <div className="park-card-photo">
          <Image
            src={visual.imageUrl}
            alt={visual.imageAlt}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
          <span className="park-photo-label">{visual.eyebrow}</span>
        </div>
        <div className="park-card-copy">
          <p className="park-state">{park.state}</p>
          <h3>
            {park.name}
            <Icon name="arrow" size={21} />
          </h3>
          <p>{visual.tagline}</p>
          <span className="park-trail-count">
            {available && park.trails.length > 0
              ? `${park.trails.length} ${park.trails.length === 1 ? "trail" : "trails"} to explore`
              : "Discover the park"}
          </span>
        </div>
      </Link>
      <ParkFavoriteButton
        parkSlug={park.slug}
        parkName={park.name}
        className="park-save"
      />
    </article>
  );
}
