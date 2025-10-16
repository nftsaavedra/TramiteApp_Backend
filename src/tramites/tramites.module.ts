import { Module } from '@nestjs/common';
import { TramitesService } from './tramites.service';
import { TramitesController } from './tramites.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { PlazoModule } from '@/common/plazo/plazo.module';

@Module({
  imports: [PrismaModule, PlazoModule],
  controllers: [TramitesController],
  providers: [TramitesService],
})
export class TramitesModule {}
