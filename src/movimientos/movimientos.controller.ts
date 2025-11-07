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
  // 1. BadRequestException ya no es necesario aquí
  ParseUUIDPipe, // 2. Importar ParseUUIDPipe
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
    return this.movimientosService.create(createMovimientoDto, user);
  }

  @Get()
  findAll() {
    return this.movimientosService.findAll();
  }

  @Get(':id')
  // 5. Añadir Pipe de validación
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.movimientosService.findOne(id);
  }

  @Patch(':id')
  // 5. Añadir Pipe de validación
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMovimientoDto: UpdateMovimientoDto,
  ) {
    return this.movimientosService.update(id, updateMovimientoDto);
  }

  @Delete(':id')
  // 5. Añadir Pipe de validación
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.movimientosService.remove(id);
  }
}
