import { Test, TestingModule } from '@nestjs/testing';
import { PlazoService } from './plazo.service';

describe('PlazoService', () => {
  let service: PlazoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlazoService],
    }).compile();

    service = module.get<PlazoService>(PlazoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
