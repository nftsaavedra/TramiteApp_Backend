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
  // 1. Eliminar ParseUUIDPipe de las importaciones
} from '@nestjs/common';
import { TramitesService } from './tramites.service';
import { CreateTramiteDto } from './dto/create-tramite.dto';
import { UpdateTramiteDto } from './dto/update-tramite.dto';
import { FindAllTramitesDto } from './dto/find-all-tramites.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth/jwt-auth.guard';
import { GetUser } from '@/auth/decorators/get-user.decorator';
import { type User } from '@prisma/client';

@Controller('tramites')
@UseGuards(JwtAuthGuard)
export class TramitesController {
  constructor(private readonly tramitesService: TramitesService) {}

  @Post()
  create(@Body() createTramiteDto: CreateTramiteDto, @GetUser() user: User) {
    return this.tramitesService.create(createTramiteDto, user);
  }

  @Get()
  findAll(@Query() query: FindAllTramitesDto) {
    return this.tramitesService.findAll(query);
  }

  @Get(':id')
  // 2. Eliminar el Pipe
  findOne(@Param('id') id: string) {
    return this.tramitesService.findOne(id);
  }

  @Patch(':id')
  // 2. Eliminar el Pipe
  update(@Param('id') id: string, @Body() updateTramiteDto: UpdateTramiteDto) {
    return this.tramitesService.update(id, updateTramiteDto);
  }

  @Delete(':id')
  // 2. Eliminar el Pipe
  remove(@Param('id') id: string) {
    return this.tramitesService.remove(id);
  }
}
