// En: src/feriados/controller/feriados.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { FeriadosService } from './feriados.service';
import { CreateFeriadoDto } from './dto/create-feriado.dto';
import { UpdateFeriadoDto } from './dto/update-feriado.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles/roles.guard';
import { Roles } from '@/common/decorators/roles/roles.decorator';
import { Role } from '@prisma/client';

@Controller('feriados')
@UseGuards(JwtAuthGuard, RolesGuard) // Protegemos todas las rutas
export class FeriadosController {
  constructor(private readonly feriadosService: FeriadosService) {}

  @Post()
  @Roles(Role.ADMIN) // Solo los administradores pueden crear
  create(@Body() createFeriadoDto: CreateFeriadoDto) {
    return this.feriadosService.create(createFeriadoDto);
  }

  @Get() // Todos los usuarios autenticados pueden ver los feriados
  findAll() {
    return this.feriadosService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  findOne(@Param('id') id: string) {
    return this.feriadosService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() updateFeriadoDto: UpdateFeriadoDto) {
    return this.feriadosService.update(id, updateFeriadoDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.feriadosService.remove(id);
  }
}
