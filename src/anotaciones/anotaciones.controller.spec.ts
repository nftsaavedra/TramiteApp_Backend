import { Test, TestingModule } from '@nestjs/testing';
import { AnotacionesController } from './anotaciones.controller';
import { AnotacionesService } from './anotaciones.service';

describe('AnotacionesController', () => {
  let controller: AnotacionesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnotacionesController],
      providers: [AnotacionesService],
    }).compile();

    controller = module.get<AnotacionesController>(AnotacionesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
