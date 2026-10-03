import type { ParkDigest } from "./api";

export function getDigestRiskLevel(
  digest:
    | Pick<
        ParkDigest,
        "structuredOutput" | "hazardAssessment" | "hazards" | "dataAvailability"
      >
    | null
    | undefined,
): string {
  if (!digest) return "UNKNOWN";
  if (
    digest.dataAvailability?.alerts === false &&
    digest.dataAvailability.weather === false
  )
    return "UNKNOWN";
  const severities = { low: 1, moderate: 2, medium: 2, high: 3, extreme: 4 };
  const highest = digest.hazards.reduce<string | undefined>((level, hazard) => {
    const rank = (value: string | undefined) =>
      severities[value?.toLowerCase() as keyof typeof severities] ?? 0;
    return rank(hazard.severity) > rank(level) ? hazard.severity : level;
  }, undefined);
  return (
    digest?.structuredOutput?.riskLevel ??
    digest?.hazardAssessment?.riskLevel ??
    highest ??
    "UNKNOWN"
  );
}

export function getGenerationSourceLabel(
  source: ParkDigest["generationSource"] | null | undefined,
): string {
  switch (source) {
    case "local":
      return "Local model";
    case "deepseek":
      return "DeepSeek";
    case "fallback":
      return "Rules";
    default:
      return "Unavailable";
  }
}
