import { Test, TestingModule } from '@nestjs/testing';
import { ParksService } from './parks.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ParksService', () => {
  let service: ParksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParksService,
        {
          provide: PrismaService,
          useValue: {
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
            $executeRawUnsafe: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ParksService>(ParksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
