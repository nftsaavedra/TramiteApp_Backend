import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTiposDocumentoDto } from './dto/create-tipos-documento.dto';
import { UpdateTiposDocumentoDto } from './dto/update-tipos-documento.dto';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class TiposDocumentoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTiposDocumentoDto: CreateTiposDocumentoDto) {
    return this.prisma.tipoDocumento.create({
      data: createTiposDocumentoDto,
    });
  }

  async findAll() {
    return this.prisma.tipoDocumento.findMany({
      where: { isActive: true },
    });
  }

  async findOne(id: string) {
    const tipoDocumento = await this.prisma.tipoDocumento.findUnique({
      where: { id },
    });

    if (!tipoDocumento) {
      throw new NotFoundException(
        `Tipo de Documento con ID "${id}" no encontrado`,
      );
    }
    return tipoDocumento;
  }

  async update(id: string, updateTiposDocumentoDto: UpdateTiposDocumentoDto) {
    await this.findOne(id);
    return this.prisma.tipoDocumento.update({
      where: { id },
      data: updateTiposDocumentoDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.tipoDocumento.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
  }
}
