// En: src/common/plazo/plazo.module.ts

import { Module } from '@nestjs/common';
import { PlazoService } from './plazo.service';
import { PrismaModule } from '@/prisma/prisma.module'; // <-- Importar PrismaModule

@Module({
  imports: [PrismaModule], // <-- Añadir PrismaModule a los imports
  providers: [PlazoService],
  exports: [PlazoService], // <-- Exportar el servicio para que otros módulos puedan usarlo
})
export class PlazoModule {}
