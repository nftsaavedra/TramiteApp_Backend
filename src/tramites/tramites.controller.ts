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
import { TramitesService } from './tramites.service';
import { CreateTramiteDto } from './dto/create-tramite.dto';
import { UpdateTramiteDto } from './dto/update-tramite.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth/jwt-auth.guard'; // <-- Importación correcta

@Controller('tramites')
@UseGuards(JwtAuthGuard) // --- AÑADIDO: Protege todas las rutas de este controlador
export class TramitesController {
  constructor(private readonly tramitesService: TramitesService) {}

  @Post()
  create(@Body() createTramiteDto: CreateTramiteDto) {
    return this.tramitesService.create(createTramiteDto);
  }

  @Get()
  findAll() {
    return this.tramitesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    // --- CORREGIDO: Se eliminó el '+' de '+id'
    return this.tramitesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTramiteDto: UpdateTramiteDto) {
    // --- CORREGIDO: Se eliminó el '+' de '+id'
    return this.tramitesService.update(id, updateTramiteDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    // --- CORREGIDO: Se eliminó el '+' de '+id'
    return this.tramitesService.remove(id);
  }
}
