import Image from "next/image";
import Link from "next/link";
import type { TrailSummary } from "@/lib/api";
import RiskBadge from "@/components/risk-badge";
import Icon from "@/components/ui-icon";
type Props = {
  trail: TrailSummary;
  parkName?: string;
  visualImageUrl?: string;
  theme?: "light" | "dark";
  riskLevel?: string | null;
  status?: string | null;
};
export default function TrailCard({
  trail,
  parkName,
  visualImageUrl,
  riskLevel,
  status,
}: Props) {
  return (
    <Link href={`/trails/${trail.id}`} className="trail-card">
      <div className="trail-card-photo">
        {visualImageUrl && (
          <Image
            src={visualImageUrl}
            alt={`Landscape of ${parkName ?? trail.park?.name ?? "the park"}; trail-specific photograph unavailable.`}
            fill
            sizes="(min-width:1024px) 33vw, 100vw"
            className="object-cover"
          />
        )}
        <span>Explore a trail</span>
      </div>
      <div className="trail-card-copy">
        <p className="eyebrow">{parkName ?? trail.park?.name}</p>
        <h3>{trail.name}</h3>
        <p>Route details, weather, and recent trail reports.</p>
        <div>
          {riskLevel && <RiskBadge level={riskLevel} />}
          <span>{status ?? "View trail conditions"}</span>
          <Icon name="arrow" size={18} />
        </div>
      </div>
    </Link>
  );
}
