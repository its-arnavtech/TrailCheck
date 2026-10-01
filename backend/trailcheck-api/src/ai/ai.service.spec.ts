jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
}));

import { GoogleGenAI } from '@google/genai';
import { AiService } from './ai.service';
import type { SeasonalHazardAssessment } from '../hazards/hazard.types';

const GoogleGenAIMock = GoogleGenAI as unknown as jest.Mock;

const GEMINI_ANSWER =
  'Heat is the main concern on exposed Yosemite trails this afternoon. Carry extra water, start early, and turn around if you feel lightheaded.';

function assessment(): SeasonalHazardAssessment {
  return {
    parkSlug: 'yosemite',
    parkCode: 'yose',
    season: 'summer',
    profile: 'alpine',
    riskLevel: 'high',
    ignoredHazards: [],
    weatherFeatures: {
      periodCount: 0,
      maxTemperatureF: 95,
      minTemperatureF: 62,
      maxWindMph: 8,
      wetPeriods: 0,
      snowPeriods: 0,
      thunderPeriods: 0,
      smokePeriods: 0,
      hotPeriods: 1,
      coldPeriods: 0,
      freezeThaw: false,
      heavyRainSignal: false,
      sustainedWetPattern: false,
      dryWindSignal: false,
      combinedText: 'hot',
    },
    activeHazards: [
      {
        id: 'heat-1',
        type: 'HEAT',
        title: 'Dangerous heat',
        severity: 'high',
        priority: 'high',
        score: 4,
        source: 'nws',
        summary: 'Afternoon temperatures make exposed trails risky.',
        reason: 'Forecast exceeds the heat threshold.',
        evidence: ['95 F'],
        tags: ['heat'],
        season: 'summer',
        profile: 'alpine',
      },
    ],
  };
}

describe('AiService fallback chain', () => {
  let generateContent: jest.Mock;
  let localGenerate: jest.Mock;
  let configValues: Record<string, string | undefined>;

  function createService() {
    generateContent = jest.fn();
    GoogleGenAIMock.mockImplementation(() => ({
      models: { generateContent },
    }));
    localGenerate = jest.fn();

    const service = new AiService(
      { get: jest.fn((key: string) => configValues[key]) } as never,
      {
        getAlertsPayloadForPark: jest.fn().mockResolvedValue({
          parkCode: 'yose',
          raw: { data: [] },
          alerts: [],
        }),
      } as never,
      {
        getWeatherPayloadForPark: jest.fn().mockResolvedValue({
          raw: { forecast: null },
          weather: null,
        }),
      } as never,
      {
        assessParkHazards: jest.fn().mockReturnValue(assessment()),
        buildNotice: jest
          .fn()
          .mockReturnValue('Heat is the main concern right now.'),
      } as never,
      {
        isAvailable: jest.fn().mockReturnValue(false),
        park: { findUnique: jest.fn() },
        parkSnapshot: { create: jest.fn() },
      } as never,
      {
        isEnabled: jest
          .fn()
          .mockReturnValue(configValues.LOCAL_MODEL_ENABLED !== 'false'),
        getTimeoutMs: jest.fn().mockReturnValue(1000),
        generate: localGenerate,
      } as never,
    );

    return service;
  }

  beforeEach(() => {
    configValues = {
      GEMINI_API_KEY: '',
      LOCAL_MODEL_ENABLED: 'true',
    };
    GoogleGenAIMock.mockReset();
  });

  it('uses the local model when it returns valid structured output', async () => {
    localGenerate = jest.fn();
    const service = createService();
    localGenerate.mockResolvedValue({
      ok: true,
      fallbackRecommended: false,
      errors: [],
      output: {
        riskLevel: 'HIGH',
        hazards: [
          {
            type: 'HEAT',
            severity: 'HIGH',
            reason: 'Exposed trails are very hot.',
          },
        ],
        alerts: [],
        notification: 'Dangerous heat is the main trail concern today.',
        recommendedAction: 'Start early and carry extra water.',
      },
    });

    const response = await service.ask({
      parkSlug: 'yosemite',
      question: 'Is it safe to hike this afternoon?',
    });

    expect(response.generationSource).toBe('local');
    expect(response.structuredOutput?.riskLevel).toBe('HIGH');
    expect(response.answer).toContain('Dangerous heat');
    expect(GoogleGenAIMock).not.toHaveBeenCalled();
  });

  it('uses the rules summary when the local model fails and Gemini is not configured', async () => {
    const service = createService();
    localGenerate.mockResolvedValue({
      ok: false,
      fallbackRecommended: true,
      output: null,
      errors: ['Local model adapter is not ready.'],
    });

    const response = await service.ask({
      parkSlug: 'yosemite',
      question: 'What should I watch for?',
    });

    expect(response.generationSource).toBe('fallback');
    expect(response.structuredOutput).toBeNull();
    expect(response.answer.toLowerCase()).toContain('dangerous heat');
    expect(response.generationError).toContain('adapter is not ready');
    expect(response.generationError).toContain('GEMINI_API_KEY is missing');
    expect(GoogleGenAIMock).not.toHaveBeenCalled();
  });

  it('falls through to Gemini when the local model fails and a key is configured', async () => {
    configValues.GEMINI_API_KEY = 'test-gemini-key';
    const service = createService();
    localGenerate.mockResolvedValue({
      ok: false,
      fallbackRecommended: true,
      output: null,
      errors: ['connect ECONNREFUSED 127.0.0.1:8001'],
    });
    generateContent.mockResolvedValue({ text: GEMINI_ANSWER });

    const response = await service.ask({
      parkSlug: 'yosemite',
      question: 'What should I watch for?',
    });

    expect(response.generationSource).toBe('gemini');
    expect(response.answer).toBe(GEMINI_ANSWER);
    expect(response.generationError).toContain('ECONNREFUSED');
    expect(GoogleGenAIMock).toHaveBeenCalledWith({ apiKey: 'test-gemini-key' });
  });

  it('uses the rules summary when Gemini also fails', async () => {
    configValues.GEMINI_API_KEY = 'test-gemini-key';
    const service = createService();
    localGenerate.mockResolvedValue({
      ok: false,
      fallbackRecommended: true,
      output: null,
      errors: ['timed out'],
    });
    generateContent.mockRejectedValue(new Error('Gemini unavailable'));

    const digest = await service.generateParkDigest('yosemite');

    expect(digest.generationSource).toBe('fallback');
    expect(digest.hazardAssessment.riskLevel).toBe('high');
    expect(digest.shortSummary).toContain('Afternoon temperatures');
    expect(digest.generationError).toContain('Gemini unavailable');
  });

  it('skips the local model when it is disabled and still reaches the rules summary', async () => {
    configValues.LOCAL_MODEL_ENABLED = 'false';
    const service = createService();

    const response = await service.ask({
      parkSlug: 'yosemite',
      question: 'Any closures?',
    });

    expect(localGenerate).not.toHaveBeenCalled();
    expect(response.generationSource).toBe('fallback');
    expect(response.answer.toLowerCase()).toContain('dangerous heat');
  });
});
