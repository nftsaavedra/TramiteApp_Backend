import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TiposDocumentoService } from './tipos-documento.service';
import { CreateTiposDocumentoDto } from './dto/create-tipos-documento.dto';
import { UpdateTiposDocumentoDto } from './dto/update-tipos-documento.dto';

@Controller('tipos-documento')
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
    return this.tiposDocumentoService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTiposDocumentoDto: UpdateTiposDocumentoDto) {
    return this.tiposDocumentoService.update(+id, updateTiposDocumentoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tiposDocumentoService.remove(+id);
  }
}
