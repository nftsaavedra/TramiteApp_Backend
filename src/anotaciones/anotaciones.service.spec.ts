import { Test, TestingModule } from '@nestjs/testing';
import { AnotacionesService } from './anotaciones.service';

describe('AnotacionesService', () => {
  let service: AnotacionesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnotacionesService],
    }).compile();

    service = module.get<AnotacionesService>(AnotacionesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
