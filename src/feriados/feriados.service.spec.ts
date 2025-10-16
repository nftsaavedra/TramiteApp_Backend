import { Test, TestingModule } from '@nestjs/testing';
import { FeriadosService } from './feriados.service';

describe('FeriadosService', () => {
  let service: FeriadosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FeriadosService],
    }).compile();

    service = module.get<FeriadosService>(FeriadosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
