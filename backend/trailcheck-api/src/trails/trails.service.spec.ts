import { NotFoundException } from '@nestjs/common';
import { TrailsService } from './trails.service';
import { PrismaService } from '../prisma/prisma.service';
import { NpsService } from '../nps/nps.service';
import { WeatherService } from '../weather/weather.service';
import { getStaticTrails } from '../catalog/static-park-data';

describe('TrailsService condition availability', () => {
  const prisma = { isAvailable: jest.fn(), trail: { findUnique: jest.fn() } };
  const nps = { getAlertsPayloadForPark: jest.fn() };
  const weather = { getWeatherForPark: jest.fn() };
  const service = new TrailsService(
    prisma as unknown as PrismaService,
    nps as unknown as NpsService,
    weather as unknown as WeatherService,
  );
  beforeEach(() => {
    jest.resetAllMocks();
    nps.getAlertsPayloadForPark.mockResolvedValue({ raw: null, alerts: [] });
    weather.getWeatherForPark.mockResolvedValue(null);
  });
  it('marks static fallback hazards and reports as unavailable', async () => {
    prisma.isAvailable.mockReturnValue(false);
    const result = await service.findOne(getStaticTrails()[0].id);
    expect(result.dataAvailability).toEqual({
      hazards: false,
      reports: false,
      alerts: false,
      weather: false,
    });
    expect(result.hazards).toEqual([]);
    expect(prisma.trail.findUnique).not.toHaveBeenCalled();
  });
  it('queries active hazards and distinguishes a successful empty alert feed', async () => {
    prisma.isAvailable.mockReturnValue(true);
    prisma.trail.findUnique.mockResolvedValue({
      id: 1,
      name: 'Trail',
      park: { slug: 'yosemite' },
      hazards: [],
      reports: [],
    });
    nps.getAlertsPayloadForPark.mockResolvedValue({
      raw: { data: [] },
      alerts: [],
    });
    const result = await service.findOne(1);
    const [query] = prisma.trail.findUnique.mock.calls[0] as [
      {
        select: { hazards: { where: { isActive: boolean } } };
      },
    ];
    expect(query.select.hazards.where).toEqual({ isActive: true });
    expect(result.dataAvailability).toEqual({
      hazards: true,
      reports: true,
      alerts: true,
      weather: false,
    });
  });
  it('survives failed upstream feeds without claiming availability', async () => {
    prisma.isAvailable.mockReturnValue(false);
    nps.getAlertsPayloadForPark.mockRejectedValue(new Error('offline'));
    weather.getWeatherForPark.mockRejectedValue(new Error('offline'));
    const result = await service.findOne(getStaticTrails()[0].id);
    expect(result.dataAvailability.alerts).toBe(false);
    expect(result.dataAvailability.weather).toBe(false);
    expect(result.npsAlerts).toEqual([]);
  });
  it('preserves a 404 for a nonexistent trail', async () => {
    prisma.isAvailable.mockReturnValue(false);
    await expect(service.findOne(-1)).rejects.toThrow(NotFoundException);
  });
});
