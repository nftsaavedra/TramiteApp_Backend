import { Module } from '@nestjs/common';
import { MovimientosService } from './movimientos.service';
import { MovimientosController } from './movimientos.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { SystemConfigModule } from '@/system-config/system-config.module';

@Module({
  imports: [PrismaModule, SystemConfigModule],
  controllers: [MovimientosController],
  providers: [MovimientosService],
})
export class MovimientosModule {}
