import type { ParkDigest } from './api';

export function getDigestRiskLevel(
  digest: Pick<ParkDigest, 'structuredOutput' | 'hazardAssessment' | 'hazards'> | null | undefined,
): string {
  return (
    digest?.structuredOutput?.riskLevel ??
    digest?.hazardAssessment?.riskLevel ??
    digest?.hazards[0]?.severity ??
    'LOW'
  );
}

export function getGenerationSourceLabel(
  source: ParkDigest['generationSource'] | null | undefined,
): string {
  switch (source) {
    case 'local':
      return 'Local model';
    case 'deepseek':
      return 'DeepSeek';
    case 'fallback':
      return 'Rules';
    default:
      return 'Unavailable';
  }
}
