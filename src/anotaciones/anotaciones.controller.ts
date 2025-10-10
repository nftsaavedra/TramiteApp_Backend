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
} from '@nestjs/common';
import { AnotacionesService } from './anotaciones.service';
import { CreateAnotacioneDto } from './dto/create-anotacione.dto';
import { UpdateAnotacioneDto } from './dto/update-anotacione.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth/jwt-auth.guard';
import { GetUser } from '@/auth/decorators/get-user.decorator';
import type { User } from '@prisma/client';

@Controller('anotaciones')
@UseGuards(JwtAuthGuard) // Protegemos todas las rutas de anotaciones
export class AnotacionesController {
  constructor(private readonly anotacionesService: AnotacionesService) {}

  @Post()
  create(
    @Body() createAnotacioneDto: CreateAnotacioneDto,
    @GetUser('id') autorId: string, // Obtenemos el ID del autor desde el token
  ) {
    return this.anotacionesService.create(createAnotacioneDto, autorId);
  }

  // Endpoint para obtener las anotaciones de un trámite específico
  // EJ: GET /anotaciones?tramiteId=...
  @Get()
  findAll(@Query('tramiteId') tramiteId: string) {
    return this.anotacionesService.findAllByTramite(tramiteId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.anotacionesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAnotacioneDto: UpdateAnotacioneDto,
    @GetUser() user: User, // Pasamos el objeto de usuario completo para la validación
  ) {
    return this.anotacionesService.update(id, updateAnotacioneDto, user);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @GetUser() user: User, // Pasamos el objeto de usuario completo para la validación
  ) {
    return this.anotacionesService.remove(id, user);
  }
}
