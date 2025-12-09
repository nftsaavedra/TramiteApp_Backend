import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { CreateAnotacioneDto } from './dto/create-anotacione.dto';
import { UpdateAnotacioneDto } from './dto/update-anotacione.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class AnotacionesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createAnotacioneDto: CreateAnotacioneDto, autorId: string) {
    const { tramiteId, movimientoId, contenido } = createAnotacioneDto;

    // 1. Buscamos el trámite y su último movimiento para validar reglas de negocio
    const tramite = await this.prisma.tramite.findUniqueOrThrow({
      where: { id: tramiteId },
      include: {
        movimientos: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    // 2. Regla: "solo para el ultimo movimiento activo o con estado general de tramite activo o en proceso"
    // Interpretación:
    // - Si se anota el TRÁMITE (general): Debe estar EN_PROCESO.
    // - Si se anota un MOVIMIENTO: Debe ser el ÚLTIMO movimiento (el activo).

    const isTramiteActivo = tramite.estado === 'EN_PROCESO';

    if (movimientoId) {
      // Validar que el movimiento existe y es el último
      const ultimoMovimiento = tramite.movimientos[0];
      if (!ultimoMovimiento) {
        throw new BadRequestException(
          'El trámite no tiene movimientos activos.',
        );
      }
      if (ultimoMovimiento.id !== movimientoId) {
        throw new BadRequestException(
          'Solo se permite agregar anotaciones al último movimiento registrado (movimiento activo).',
        );
      }
      // Nota: Si es el último movimiento, permitimos anotar incluso si el trámite cambió de estado?
      // La regla dice "o con estado general ... activo".
      // Asumimos que si apuntamos al último movimiento, es válido.
    } else {
      // Anotación General
      if (!isTramiteActivo) {
        throw new BadRequestException(
          'Solo se pueden agregar anotaciones a trámites activos o en proceso.',
        );
      }
    }

    return this.prisma.anotacion.create({
      data: {
        contenido,
        tramiteId,
        autorId,
        movimientoId,
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
        movimiento: {
          select: {
            id: true,
            tipoAccion: true,
            oficinaOrigen: { select: { siglas: true } },
          },
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
