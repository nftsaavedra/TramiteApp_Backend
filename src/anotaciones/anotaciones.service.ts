import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateAnotacioneDto } from './dto/create-anotacione.dto';
import { UpdateAnotacioneDto } from './dto/update-anotacione.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class AnotacionesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createAnotacioneDto: CreateAnotacioneDto, autorId: string) {
    const { tramiteId, contenido } = createAnotacioneDto;

    // Verificamos que el trámite exista antes de añadirle una anotación
    await this.prisma.tramite.findUniqueOrThrow({ where: { id: tramiteId } });

    return this.prisma.anotacion.create({
      data: {
        contenido,
        tramiteId,
        autorId,
      },
    });
  }

  // Las anotaciones se buscarán principalmente por trámite
  async findAllByTramite(tramiteId: string) {
    return this.prisma.anotacion.findMany({
      where: { tramiteId },
      include: {
        autor: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const anotacion = await this.prisma.anotacion.findUnique({
      where: { id },
    });
    if (!anotacion) {
      throw new NotFoundException(`Anotación con ID "${id}" no encontrada.`);
    }
    return anotacion;
  }

  // Solo el autor original puede editar su anotación
  async update(
    id: string,
    updateAnotacioneDto: UpdateAnotacioneDto,
    user: User,
  ) {
    const anotacion = await this.findOne(id);
    if (anotacion.autorId !== user.id) {
      throw new UnauthorizedException(
        'No tiene permiso para editar esta anotación.',
      );
    }
    return this.prisma.anotacion.update({
      where: { id },
      data: updateAnotacioneDto,
    });
  }

  // Solo el autor original o un ADMIN pueden eliminar
  async remove(id: string, user: User) {
    const anotacion = await this.findOne(id);
    if (anotacion.autorId !== user.id && user.role !== 'ADMIN') {
      throw new UnauthorizedException(
        'No tiene permiso para eliminar esta anotación.',
      );
    }
    await this.prisma.anotacion.delete({
      where: { id },
    });
    return { message: 'Anotación eliminada exitosamente.' };
  }
}
