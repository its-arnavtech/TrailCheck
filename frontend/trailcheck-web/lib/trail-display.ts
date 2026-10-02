import type { TrailDetail } from "./api";

export function getTrailRisk(trail: TrailDetail): string {
  if (trail.dataAvailability?.hazards === false) return "UNKNOWN";
  const ranks = ["LOW", "MODERATE", "HIGH", "EXTREME"];
  const levels = (trail.hazards ?? [])
    .filter((hazard) => hazard.isActive)
    .map((hazard) =>
      hazard.severity.toUpperCase() === "MEDIUM"
        ? "MODERATE"
        : hazard.severity.toUpperCase(),
    );
  return (
    ranks.toReversed().find((level) => levels.includes(level)) ?? "UNKNOWN"
  );
}
