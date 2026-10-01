import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import RiskBadge from '@/components/risk-badge';
import SafetyDigest from '@/components/safety-digest';
import type { ParkDigest } from '@/lib/api';
import { getDigestRiskLevel, getGenerationSourceLabel } from '@/lib/digest-display';
import { passwordMeetsPolicy } from '@/lib/password-policy';

function digest(overrides: Partial<ParkDigest> = {}): ParkDigest {
  return {
    parkSlug: 'yosemite',
    shortSummary: 'Heat is the main concern on exposed trails.',
    notification: 'Dangerous heat this afternoon.',
    generationSource: 'fallback',
    generationError: null,
    hazards: [
      {
        id: 'heat-1',
        title: 'Dangerous heat',
        severity: 'moderate',
        source: 'nws',
        summary: 'Exposed trails are hot.',
        evidence: [],
        tags: [],
      },
    ],
    alerts: [],
    weather: null,
    ...overrides,
  };
}

describe('digest display', () => {
  it('prefers the rules-engine risk over the first hazard severity', () => {
    expect(
      getDigestRiskLevel(
        digest({
          hazardAssessment: { riskLevel: 'high' },
        }),
      ),
    ).toBe('high');
  });

  it('prefers structured model output when that path produced the digest', () => {
    expect(
      getDigestRiskLevel(
        digest({
          generationSource: 'local',
          hazardAssessment: { riskLevel: 'high' },
          structuredOutput: {
            riskLevel: 'EXTREME',
            hazards: [],
            alerts: [],
            notification: 'Extreme heat.',
            recommendedAction: 'Postpone the hike.',
          },
        }),
      ),
    ).toBe('EXTREME');
  });

  it('names each generation path', () => {
    expect(getGenerationSourceLabel('local')).toBe('Local model');
    expect(getGenerationSourceLabel('gemini')).toBe('Gemini');
    expect(getGenerationSourceLabel('fallback')).toBe('Rules');
    expect(getGenerationSourceLabel(undefined)).toBe('Unavailable');
  });
});

describe('SafetyDigest', () => {
  it('shows the rules risk and source when no model output is present', () => {
    const html = renderToStaticMarkup(
      createElement(SafetyDigest, {
        parkName: 'Yosemite',
        digest: digest({ hazardAssessment: { riskLevel: 'high' } }),
      }),
    );

    expect(html).toContain('Risk high');
    expect(html).toContain('Rules');
    expect(html).toContain('Dangerous heat this afternoon.');
  });

  it('says the digest is unavailable instead of inventing a fallback source', () => {
    const html = renderToStaticMarkup(
      createElement(SafetyDigest, { digest: null, parkName: 'Yosemite' }),
    );

    expect(html).toContain('Unavailable');
    expect(html).not.toContain('>Fallback<');
  });
});

describe('RiskBadge', () => {
  it('renders a normalized risk label', () => {
    const html = renderToStaticMarkup(createElement(RiskBadge, { level: 'moderate' }));
    expect(html).toContain('Risk moderate');
  });
});

describe('password policy', () => {
  it('requires the same complexity the signup form enforces', () => {
    expect(passwordMeetsPolicy('short')).toBe(false);
    expect(passwordMeetsPolicy('alllowercase12!')).toBe(false);
    expect(passwordMeetsPolicy('TrailCheck-2026')).toBe(true);
  });
});
