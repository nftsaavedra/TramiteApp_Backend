import { Module } from '@nestjs/common';
import { AnotacionesService } from './anotaciones.service';
import { AnotacionesController } from './anotaciones.controller';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AnotacionesController],
  providers: [AnotacionesService],
})
export class AnotacionesModule {}
