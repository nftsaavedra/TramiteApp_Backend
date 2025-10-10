import { Module } from '@nestjs/common';
import { AnotacionesService } from './anotaciones.service';
import { AnotacionesController } from './anotaciones.controller';

@Module({
  controllers: [AnotacionesController],
  providers: [AnotacionesService],
})
export class AnotacionesModule {}
