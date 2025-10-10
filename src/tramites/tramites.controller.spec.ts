import { Test, TestingModule } from '@nestjs/testing';
import { TramitesController } from './tramites.controller';
import { TramitesService } from './tramites.service';

describe('TramitesController', () => {
  let controller: TramitesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TramitesController],
      providers: [TramitesService],
    }).compile();

    controller = module.get<TramitesController>(TramitesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
