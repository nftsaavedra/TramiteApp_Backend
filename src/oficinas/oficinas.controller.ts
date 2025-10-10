import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { OficinasService } from './oficinas.service';
import { CreateOficinaDto } from './dto/create-oficina.dto';
import { UpdateOficinaDto } from './dto/update-oficina.dto';

@Controller('oficinas')
export class OficinasController {
  constructor(private readonly oficinasService: OficinasService) {}

  @Post()
  create(@Body() createOficinaDto: CreateOficinaDto) {
    return this.oficinasService.create(createOficinaDto);
  }

  // --- MÉTODO ACTUALIZADO ---
  // Acepta el query param 'tree'
  @Get()
  findAll(@Query('tree') tree?: string) {
    const wantTree = tree === 'true';
    return this.oficinasService.findAll(wantTree);
  }

  // --- CORREGIDO ---
  // Se eliminó el '+' de '+id'
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.oficinasService.findOne(id);
  }

  // --- CORREGIDO ---
  // Se eliminó el '+' de '+id'
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOficinaDto: UpdateOficinaDto) {
    return this.oficinasService.update(id, updateOficinaDto);
  }

  // --- CORREGIDO ---
  // Se eliminó el '+' de '+id'
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.oficinasService.remove(id);
  }
}
