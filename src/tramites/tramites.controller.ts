// En: src/tramites/tramites.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query, // 1. Importar Query
} from '@nestjs/common';
import { TramitesService } from './tramites.service';
import { CreateTramiteDto } from './dto/create-tramite.dto';
import { UpdateTramiteDto } from './dto/update-tramite.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth/jwt-auth.guard';
import { FindAllTramitesDto } from './dto/find-all-tramites.dto'; // 2. Importar el nuevo DTO

@Controller('tramites')
@UseGuards(JwtAuthGuard)
export class TramitesController {
  constructor(private readonly tramitesService: TramitesService) {}

  @Post()
  create(@Body() createTramiteDto: CreateTramiteDto) {
    return this.tramitesService.create(createTramiteDto);
  }

  // 3. Modificar el método findAll para que acepte los query params
  @Get()
  findAll(@Query() query: FindAllTramitesDto) {
    return this.tramitesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tramitesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTramiteDto: UpdateTramiteDto) {
    return this.tramitesService.update(id, updateTramiteDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tramitesService.remove(id);
  }
}
