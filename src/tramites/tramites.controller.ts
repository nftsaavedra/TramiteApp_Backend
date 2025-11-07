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
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { TramitesService } from './tramites.service';
import { CreateTramiteDto } from './dto/create-tramite.dto';
import { UpdateTramiteDto } from './dto/update-tramite.dto';
import { FindAllTramitesDto } from './dto/find-all-tramites.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth/jwt-auth.guard';
import { GetUser } from '@/auth/decorators/get-user.decorator';

// --- CORRECCIÓN DE IMPORTACIÓN ---
// Se añade 'type' para importar 'User' solo como un tipo.
import { type User } from '@prisma/client';
// --- FIN DE LA CORRECCIÓN ---

@Controller('tramites')
@UseGuards(JwtAuthGuard)
export class TramitesController {
  constructor(private readonly tramitesService: TramitesService) {}

  @Post()
  create(
    @Body() createTramiteDto: CreateTramiteDto,
    @GetUser() user: User, // Esta línea ahora es válida
  ) {
    return this.tramitesService.create(createTramiteDto, user);
  }

  @Get()
  findAll(@Query() query: FindAllTramitesDto) {
    return this.tramitesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tramitesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTramiteDto: UpdateTramiteDto,
  ) {
    return this.tramitesService.update(id, updateTramiteDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.tramitesService.remove(id);
  }
}
