// En: src/movimientos/movimientos.controller.ts

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
import type { User } from '@prisma/client';

@Controller('movimientos')
@UseGuards(JwtAuthGuard)
export class MovimientosController {
  constructor(private readonly movimientosService: MovimientosService) {}

  @Post()
  create(
    @Body() createMovimientoDto: CreateMovimientoDto,
    @GetUser() user: User,
  ) {
    // La validación de que el usuario pertenece a una oficina sigue siendo una buena práctica.
    if (!user.oficinaId) {
      throw new BadRequestException(
        'El usuario no está asignado a ninguna oficina.',
      );
    }

    // --- LLAMADA AL SERVICIO SIMPLIFICADA ---
    // Ya no pasamos user.oficinaId. El servicio se encarga de todo.
    return this.movimientosService.create(createMovimientoDto, user.id);
  }

  @Get()
  findAll() {
    return this.movimientosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.movimientosService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateMovimientoDto: UpdateMovimientoDto,
  ) {
    return this.movimientosService.update(id, updateMovimientoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.movimientosService.remove(id);
  }
}
