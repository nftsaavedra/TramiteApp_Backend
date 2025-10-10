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
import { TiposDocumentoService } from './tipos-documento.service';
import { CreateTiposDocumentoDto } from './dto/create-tipos-documento.dto';
import { UpdateTiposDocumentoDto } from './dto/update-tipos-documento.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth/jwt-auth.guard';

@Controller('tipos-documento')
@UseGuards(JwtAuthGuard)
export class TiposDocumentoController {
  constructor(private readonly tiposDocumentoService: TiposDocumentoService) {}

  @Post()
  create(@Body() createTiposDocumentoDto: CreateTiposDocumentoDto) {
    return this.tiposDocumentoService.create(createTiposDocumentoDto);
  }

  @Get()
  findAll() {
    return this.tiposDocumentoService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    // --- CORREGIDO: Se eliminó el '+' de '+id' ---
    return this.tiposDocumentoService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTiposDocumentoDto: UpdateTiposDocumentoDto,
  ) {
    // --- CORREGIDO: Se eliminó el '+' de '+id' ---
    return this.tiposDocumentoService.update(id, updateTiposDocumentoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    // --- CORREGIDO: Se eliminó el '+' de '+id' ---
    return this.tiposDocumentoService.remove(id);
  }
}
