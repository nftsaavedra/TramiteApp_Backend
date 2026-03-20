import { Module } from '@nestjs/common';
import { TramitesService } from './tramites.service';
import { TramitesController } from './tramites.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { PlazoModule } from '@/common/plazo/plazo.module';
import { SystemConfigModule } from '@/system-config/system-config.module';

@Module({
  imports: [PrismaModule, PlazoModule, SystemConfigModule],
  controllers: [TramitesController],
  providers: [TramitesService],
})
export class TramitesModule {}
