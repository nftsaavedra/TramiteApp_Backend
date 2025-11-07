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
  // 1. Eliminar ParseUUIDPipe de las importaciones
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
  // 2. Eliminar el Pipe
  findOne(@Param('id') id: string) {
    return this.movimientosService.findOne(id);
  }

  @Patch(':id')
  // 2. Eliminar el Pipe
  update(
    @Param('id') id: string,
    @Body() updateMovimientoDto: UpdateMovimientoDto,
  ) {
    return this.movimientosService.update(id, updateMovimientoDto);
  }

  @Delete(':id')
  // 2. Eliminar el Pipe
  remove(@Param('id') id: string) {
    return this.movimientosService.remove(id);
  }
}
