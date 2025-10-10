import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { MovimientosService } from './movimientos.service';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import { UpdateMovimientoDto } from './dto/update-movimiento.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth/jwt-auth.guard';
import { GetUser } from '@/auth/decorators/get-user.decorator';

// --- SOLUCIÓN: Cambiar 'import' por 'import type' ---
import type { User } from '@prisma/client';

@Controller('movimientos')
@UseGuards(JwtAuthGuard)
export class MovimientosController {
  constructor(private readonly movimientosService: MovimientosService) {}

  @Post()
  create(
    @Body() createMovimientoDto: CreateMovimientoDto,
    @GetUser() user: User, // Aquí es donde se usa el tipo 'User'
  ) {
    if (!user.oficinaId) {
      throw new BadRequestException(
        'El usuario no está asignado a ninguna oficina.',
      );
    }
    return this.movimientosService.create(
      createMovimientoDto,
      user.id,
      user.oficinaId,
    );
  }

  @Get()
  findAll() {
    return this.movimientosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    // --- CORREGIDO: Se eliminó el '+' que convierte a número
    return this.movimientosService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateMovimientoDto: UpdateMovimientoDto,
  ) {
    // --- CORREGIDO: Se eliminó el '+' que convierte a número
    return this.movimientosService.update(id, updateMovimientoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    // --- CORREGIDO: Se eliminó el '+' que convierte a número
    return this.movimientosService.remove(id);
  }
}
