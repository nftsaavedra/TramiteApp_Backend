import { Module } from '@nestjs/common';
import { PlazoService } from './plazo.service';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [PlazoService],
  exports: [PlazoService],
})
export class PlazoModule {}
