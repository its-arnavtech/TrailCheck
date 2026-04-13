export type LocalRiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';

export interface LocalHazardItem {
  type: string;
  severity: LocalRiskLevel;
  reason: string;
}

export interface LocalAlertItem {
  title: string;
  category: string;
  impact: string;
}

export interface LocalStructuredOutput {
  riskLevel: LocalRiskLevel;
  hazards: LocalHazardItem[];
  alerts: LocalAlertItem[];
  notification: string;
  recommendedAction: string;
}

export interface LocalModelResult {
  rowId?: string;
  ok: boolean;
  fallbackRecommended: boolean;
  output: LocalStructuredOutput | null;
  errors: string[];
  rawText?: string | null;
  extractedJson?: string | null;
  metadata?: Record<string, unknown>;
}
