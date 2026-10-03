import { Logger } from '@nestjs/common';
import { AiService } from './ai.service';
import { setCurrentDateForTests } from './deepseek.config';
import type { SeasonalHazardAssessment } from '../hazards/hazard.types';

const DEEPSEEK_ANSWER =
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

function jsonResponse(content: string, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue({
      choices: [{ message: { content } }],
    }),
  };
}

describe('AiService fallback chain', () => {
  let fetchMock: jest.Mock;
  let localGenerate: jest.Mock;
  let configValues: Record<string, string | undefined>;
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  function createService() {
    localGenerate = jest.fn();

    return new AiService(
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
  }

  function loggedText(): string {
    return [...logSpy.mock.calls, ...warnSpy.mock.calls]
      .flat()
      .map((part) => String(part))
      .join('\n');
  }

  beforeEach(() => {
    configValues = {
      DEEPSEEK_API_KEY: '',
      LOCAL_MODEL_ENABLED: 'true',
    };
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    logSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    setCurrentDateForTests(() => new Date('2026-10-01T15:00:00.000Z'));
  });

  afterEach(() => {
    setCurrentDateForTests(null);
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('uses the local model when it returns valid structured output', async () => {
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
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses the rules summary when the local model fails and DeepSeek is not configured', async () => {
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
    expect(response.generationError).toContain('DEEPSEEK_API_KEY is missing');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falls through to DeepSeek when the local model fails and a key is configured', async () => {
    configValues.DEEPSEEK_API_KEY = 'test-deepseek-key';
    configValues.DEEPSEEK_MODEL = 'deepseek-flash';
    const service = createService();
    localGenerate.mockResolvedValue({
      ok: false,
      fallbackRecommended: true,
      output: null,
      errors: ['connect ECONNREFUSED 127.0.0.1:8001'],
    });
    fetchMock.mockResolvedValue(jsonResponse(DEEPSEEK_ANSWER));

    const response = await service.ask({
      parkSlug: 'yosemite',
      question: 'What should I watch for?',
    });

    expect(response.generationSource).toBe('deepseek');
    expect(response.answer).toBe(DEEPSEEK_ANSWER);
    expect(response.generationError).toContain('ECONNREFUSED');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.deepseek.com/chat/completions');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer test-deepseek-key',
    });
    const rawBody = init.body;
    const body = JSON.parse(typeof rawBody === 'string' ? rawBody : '') as {
      model: string;
      max_tokens: number;
      thinking: { type: string };
      messages: Array<{ content: string }>;
    };
    expect(body.model).toBe('deepseek-flash');
    expect(body.max_tokens).toBeLessThanOrEqual(384);
    expect(body.thinking).toEqual({ type: 'disabled' });
    expect(body.messages[1].content.length).toBeLessThan(1200);
    expect(loggedText()).not.toContain('test-deepseek-key');
  });

  it('uses the rules summary when DeepSeek also fails', async () => {
    configValues.DEEPSEEK_API_KEY = 'test-deepseek-key';
    const service = createService();
    localGenerate.mockResolvedValue({
      ok: false,
      fallbackRecommended: true,
      output: null,
      errors: ['timed out'],
    });
    fetchMock.mockResolvedValue(jsonResponse('', 503));

    const digest = await service.generateParkDigest('yosemite');

    expect(digest.generationSource).toBe('fallback');
    expect(digest.hazardAssessment.riskLevel).toBe('high');
    expect(digest.shortSummary).toContain('Afternoon temperatures');
    expect(digest.generationError).toContain('status 503');
    expect(loggedText()).not.toContain('test-deepseek-key');
  });

  it('redacts the API key if a transport error includes it', async () => {
    configValues.DEEPSEEK_API_KEY = 'test-deepseek-key';
    configValues.LOCAL_MODEL_ENABLED = 'false';
    const service = createService();
    fetchMock.mockRejectedValue(
      new Error('socket hang up while sending test-deepseek-key'),
    );

    const response = await service.ask({
      parkSlug: 'yosemite',
      question: 'Any closures?',
    });

    expect(response.generationSource).toBe('fallback');
    expect(response.generationError).toContain('[redacted]');
    expect(response.generationError).not.toContain('test-deepseek-key');
    expect(loggedText()).not.toContain('test-deepseek-key');
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

  it('stops calling DeepSeek after the daily cap and serves rules instead', async () => {
    configValues.DEEPSEEK_API_KEY = 'test-deepseek-key';
    configValues.DEEPSEEK_DAILY_LIMIT = '1';
    configValues.LOCAL_MODEL_ENABLED = 'false';
    const service = createService();
    fetchMock.mockResolvedValue(jsonResponse(DEEPSEEK_ANSWER));

    const first = await service.ask({
      parkSlug: 'yosemite',
      question: 'What should I watch for?',
    });
    const second = await service.ask({
      parkSlug: 'yosemite',
      question: 'What should I watch for tomorrow?',
    });

    expect(first.generationSource).toBe('deepseek');
    expect(second.generationSource).toBe('fallback');
    expect(second.generationError).toContain(
      'DeepSeek daily request limit reached',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('caches a digest for the park trails and UTC day without spending another call', async () => {
    configValues.DEEPSEEK_API_KEY = 'test-deepseek-key';
    configValues.DEEPSEEK_DAILY_LIMIT = '1';
    configValues.LOCAL_MODEL_ENABLED = 'false';
    const service = createService();
    fetchMock.mockResolvedValue(jsonResponse(DEEPSEEK_ANSWER));

    const first = await service.generateParkDigest('yosemite');
    const second = await service.generateParkDigest('yosemite');
    expect(first.dataAvailability).toEqual({ alerts: true, weather: false });

    expect(first.generationSource).toBe('deepseek');
    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const askResponse = await service.ask({
      parkSlug: 'yosemite',
      question: 'Is the trail open?',
    });
    expect(askResponse.generationSource).toBe('fallback');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    setCurrentDateForTests(() => new Date('2026-10-02T00:00:00.000Z'));
    const nextDay = await service.generateParkDigest('yosemite');
    expect(nextDay.generationSource).toBe('deepseek');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
