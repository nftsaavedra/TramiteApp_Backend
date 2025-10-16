// En: src/feriados/service/feriados.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateFeriadoDto } from './dto/create-feriado.dto';
import { UpdateFeriadoDto } from './dto/update-feriado.dto';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class FeriadosService {
  constructor(private readonly prisma: PrismaService) {}

  create(createFeriadoDto: CreateFeriadoDto) {
    // Prisma espera un objeto Date, así que lo convertimos
    return this.prisma.feriado.create({
      data: {
        ...createFeriadoDto,
        fecha: new Date(createFeriadoDto.fecha),
      },
    });
  }

  findAll() {
    return this.prisma.feriado.findMany({
      orderBy: {
        fecha: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const feriado = await this.prisma.feriado.findUnique({
      where: { id },
    });
    if (!feriado) {
      throw new NotFoundException(`Feriado con ID "${id}" no encontrado.`);
    }
    return feriado;
  }

  async update(id: string, updateFeriadoDto: UpdateFeriadoDto) {
    await this.findOne(id);
    const data = updateFeriadoDto.fecha
      ? { ...updateFeriadoDto, fecha: new Date(updateFeriadoDto.fecha) }
      : updateFeriadoDto;

    return this.prisma.feriado.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.feriado.delete({
      where: { id },
    });
  }
}
