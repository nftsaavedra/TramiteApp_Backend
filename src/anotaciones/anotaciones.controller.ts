import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AnotacionesService } from './anotaciones.service';
import { CreateAnotacioneDto } from './dto/create-anotacione.dto';
import { UpdateAnotacioneDto } from './dto/update-anotacione.dto';

@Controller('anotaciones')
export class AnotacionesController {
  constructor(private readonly anotacionesService: AnotacionesService) {}

  @Post()
  create(@Body() createAnotacioneDto: CreateAnotacioneDto) {
    return this.anotacionesService.create(createAnotacioneDto);
  }

  @Get()
  findAll() {
    return this.anotacionesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.anotacionesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAnotacioneDto: UpdateAnotacioneDto) {
    return this.anotacionesService.update(+id, updateAnotacioneDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.anotacionesService.remove(+id);
  }
}
