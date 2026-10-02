import { AppService } from './app.service';

describe('AppService', () => {
  it('identifies the API instead of the Nest starter message', () => {
    const service = new AppService({
      isAvailable: () => true,
    } as never);

    expect(service.getHello()).toBe('TrailCheck API is running.');
    expect(service.getHealth()).toMatchObject({
      status: 'ok',
      service: 'trailcheck-api',
      database: 'connected',
    });
  });

  it('reports a degraded database without failing the health check', () => {
    const service = new AppService({
      isAvailable: () => false,
    } as never);

    expect(service.getHealth().database).toBe('degraded');
  });
});
