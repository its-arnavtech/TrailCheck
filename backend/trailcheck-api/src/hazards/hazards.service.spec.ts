import { Test, TestingModule } from '@nestjs/testing';
import { HazardsService } from './hazards.service';

describe('HazardsService', () => {
  let service: HazardsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HazardsService],
    }).compile();

    service = module.get<HazardsService>(HazardsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
