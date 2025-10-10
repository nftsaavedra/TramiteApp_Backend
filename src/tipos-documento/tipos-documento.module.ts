import { Module } from '@nestjs/common';
import { TiposDocumentoService } from './tipos-documento.service';
import { TiposDocumentoController } from './tipos-documento.controller';

@Module({
  controllers: [TiposDocumentoController],
  providers: [TiposDocumentoService],
})
export class TiposDocumentoModule {}
