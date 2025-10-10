import { Module } from '@nestjs/common';
import { TiposDocumentoService } from './tipos-documento.service';
import { TiposDocumentoController } from './tipos-documento.controller';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TiposDocumentoController],
  providers: [TiposDocumentoService],
})
export class TiposDocumentoModule {}
