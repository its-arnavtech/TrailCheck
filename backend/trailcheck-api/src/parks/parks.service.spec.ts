import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ParksService } from './parks.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ParksService', () => {
  let service: ParksService;
  let prisma: {
    isAvailable: jest.Mock;
    requireConnection: jest.Mock;
    park: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
    userParkPreference: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      upsert: jest.Mock;
      deleteMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      isAvailable: jest.fn().mockReturnValue(true),
      requireConnection: jest.fn(),
      park: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      userParkPreference: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParksService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<ParksService>(ParksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns default flags for a catalog park that is missing from the database', async () => {
    prisma.park.findUnique.mockResolvedValue(null);

    const preference = await service.getUserPreferenceForPark('yosemite', 7);

    expect(preference).toMatchObject({
      parkSlug: 'yosemite',
      parkName: 'Yosemite',
      parkState: 'California',
      isFavorite: false,
      wantsToGo: false,
    });
  });

  it('rejects an unknown park slug', async () => {
    prisma.park.findUnique.mockResolvedValue(null);

    await expect(
      service.getUserPreferenceForPark('not-a-park', 7),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
