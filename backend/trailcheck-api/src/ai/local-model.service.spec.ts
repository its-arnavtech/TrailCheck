import { ConfigService } from '@nestjs/config';
import { LocalModelService } from './local-model.service';

describe('LocalModelService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function createService(values: Record<string, string>) {
    const configService = {
      get: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService;

    return new LocalModelService(configService);
  }

  it('uses the persistent model server by default', async () => {
    const service = createService({
      LOCAL_MODEL_ENABLED: 'true',
      LOCAL_MODEL_SERVER_URL: 'http://127.0.0.1:8001',
      LOCAL_MODEL_TIMEOUT_MS: '5000',
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        fallbackRecommended: false,
        output: {
          riskLevel: 'HIGH',
          hazards: [],
          alerts: [],
          notification: 'Use caution.',
          recommendedAction: 'Check the trail before leaving.',
        },
        errors: [],
      }),
    } as Response) as typeof fetch;

    const result = await service.generate({ parkSlug: 'yosemite' });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8001/generate',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(result.ok).toBe(true);
    expect(result.output?.riskLevel).toBe('HIGH');
  });

  it('returns a clean failure result when the model server is down', async () => {
    const service = createService({
      LOCAL_MODEL_ENABLED: 'true',
      LOCAL_MODEL_SERVER_URL: 'http://127.0.0.1:8001',
      LOCAL_MODEL_TIMEOUT_MS: '5000',
    });

    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:8001')) as typeof fetch;

    const result = await service.generate({ parkSlug: 'yosemite' });

    expect(result.ok).toBe(false);
    expect(result.fallbackRecommended).toBe(true);
    expect(result.errors[0]).toContain('Local model server request failed');
  });
});
