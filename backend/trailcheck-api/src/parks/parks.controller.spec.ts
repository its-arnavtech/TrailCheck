import { Test, TestingModule } from '@nestjs/testing';
import { ParksController } from './parks.controller';
import { ParksService } from './parks.service';

describe('ParksController', () => {
  let controller: ParksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ParksController],
      providers: [
        {
          provide: ParksService,
          useValue: {
            findAll: jest.fn(),
            getUserPreferences: jest.fn(),
            getUserPreferenceForPark: jest.fn(),
            updateUserPreference: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ParksController>(ParksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
