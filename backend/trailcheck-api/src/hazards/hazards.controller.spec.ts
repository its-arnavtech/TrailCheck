import { Test, TestingModule } from '@nestjs/testing';
import { HazardsController } from './hazards.controller';

describe('HazardsController', () => {
  let controller: HazardsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HazardsController],
    }).compile();

    controller = module.get<HazardsController>(HazardsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
