// En: src/tramites/tramites.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTramiteDto } from './dto/create-tramite.dto';
import { UpdateTramiteDto } from './dto/update-tramite.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { Oficina, Prisma } from '@prisma/client'; // 1. Importar Prisma
import { FindAllTramitesDto } from './dto/find-all-tramites.dto'; // 2. Importar el DTO
import { PlazoService } from '@/common/plazo/plazo.service';

type EstadoPlazo = 'VENCIDO' | 'POR_VENCER' | 'A_TIEMPO' | 'NO_APLICA';

@Injectable()
export class TramitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plazoService: PlazoService,
  ) {}

  async findAll(query: FindAllTramitesDto) {
    const { q, estado, prioridad, page = '1', limit = '10', sortBy } = query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    const where: Prisma.TramiteWhereInput = {};
    if (q) {
      where.OR = [
        { asunto: { contains: q, mode: 'insensitive' } },
        { numeroDocumentoCompleto: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (estado) where.estado = estado;
    if (prioridad) where.prioridad = prioridad;

    const [sortByField, sortOrder] = sortBy
      ? sortBy.split(':')
      : ['fechaIngreso', 'desc'];
    const orderBy = { [sortByField]: sortOrder as Prisma.SortOrder };

    const [tramitesFromDb, total] = await this.prisma.$transaction([
      this.prisma.tramite.findMany({
        where,
        skip: (pageNumber - 1) * limitNumber,
        take: limitNumber,
        orderBy,
        include: {
          oficinaRemitente: { select: { nombre: true, siglas: true } },
          tipoDocumento: { select: { nombre: true } },
          movimientos: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              destinos: {
                take: 1,
                include: {
                  oficinaDestino: { select: { nombre: true, siglas: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.tramite.count({ where }),
    ]);

    const tramites = tramitesFromDb.map((tramite) => {
      const { diasTranscurridos, estadoPlazo } = this.getPlazoInfo(tramite);
      return {
        ...tramite,
        plazo: {
          diasTranscurridos,
          estado: estadoPlazo,
        },
      };
    });

    return {
      data: tramites,
      meta: {
        total,
        page: pageNumber,
        limit: limitNumber,
        lastPage: Math.ceil(total / limitNumber),
      },
    };
  }

  async create(createTramiteDto: CreateTramiteDto) {
    const {
      tipoDocumentoId,
      oficinaRemitenteId,
      numeroDocumento,
      ...tramiteData
    } = createTramiteDto;
    const anio = new Date().getFullYear();
    const tipoDoc = await this.prisma.tipoDocumento.findUniqueOrThrow({
      where: { id: tipoDocumentoId },
    });
    const jerarquia = await this.obtenerJerarquiaOficina(oficinaRemitenteId);
    const numeroDocumentoCompleto = `${tipoDoc.nombre}-N°-${numeroDocumento}-${anio}-${jerarquia}`;
    return this.prisma.tramite.create({
      data: {
        ...tramiteData,
        numeroDocumento,
        numeroDocumentoCompleto,
        tipoDocumentoId,
        oficinaRemitenteId,
      },
    });
  }

  private async obtenerJerarquiaOficina(oficinaId: string): Promise<string> {
    let oficinaActual: (Oficina & { parent?: Oficina | null }) | null =
      await this.prisma.oficina.findUnique({
        where: { id: oficinaId },
        include: { parent: true },
      });
    if (!oficinaActual) return '';
    const siglas: string[] = [];
    while (oficinaActual) {
      siglas.unshift(oficinaActual.siglas);
      if (oficinaActual.parentId) {
        oficinaActual = await this.prisma.oficina.findUnique({
          where: { id: oficinaActual.parentId },
          include: { parent: true },
        });
      } else {
        oficinaActual = null;
      }
    }
    return siglas.join('/');
  }

  async findOne(id: string) {
    const tramite = await this.prisma.tramite.findUnique({
      where: { id },
      include: {
        oficinaRemitente: true,
        tipoDocumento: true,
        usuarioAsignado: true,
        movimientos: {
          include: {
            oficinaOrigen: true,
            usuarioCreador: true,
            destinos: {
              include: {
                oficinaDestino: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        anotaciones: {
          include: { autor: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!tramite) {
      throw new NotFoundException(`Trámite con ID "${id}" no encontrado`);
    }

    const { diasTranscurridos, estadoPlazo } = this.getPlazoInfo(tramite);

    return {
      ...tramite,
      plazo: {
        diasTranscurridos,
        estado: estadoPlazo,
      },
    };
  }

  async update(id: string, updateTramiteDto: UpdateTramiteDto) {
    await this.findOne(id);
    return this.prisma.tramite.update({
      where: { id },
      data: updateTramiteDto,
    });
  }

  async remove(id: string) {
    throw new Error(
      'La eliminación de trámites no está permitida. Se debe archivar o cerrar.',
    );
  }

  private getPlazoInfo(tramite: {
    estado: string;
    movimientos: { createdAt: Date }[];
    fechaIngreso: Date;
  }): { diasTranscurridos: number | null; estadoPlazo: EstadoPlazo } {
    if (tramite.estado !== 'ABIERTO') {
      return { diasTranscurridos: null, estadoPlazo: 'NO_APLICA' };
    }

    // En `findAll` los movimientos vienen ordenados DESC, en `findOne` vienen ASC.
    // Esta lógica maneja ambos casos para encontrar la fecha correcta.
    let fechaReferencia: Date;
    if (tramite.movimientos?.length > 0) {
      // Si hay un solo movimiento (desde findAll), es el [0].
      // Si hay muchos (desde findOne), el último del array es el más reciente.
      fechaReferencia =
        tramite.movimientos[tramite.movimientos.length - 1].createdAt;
    } else {
      fechaReferencia = tramite.fechaIngreso;
    }

    const diasTranscurridos = this.plazoService.calcularDiasHabiles(
      fechaReferencia,
      new Date(),
    );

    let estadoPlazo: EstadoPlazo;
    if (diasTranscurridos >= 7) {
      estadoPlazo = 'VENCIDO';
    } else if (diasTranscurridos >= 5) {
      estadoPlazo = 'POR_VENCER';
    } else {
      estadoPlazo = 'A_TIEMPO';
    }

    return { diasTranscurridos, estadoPlazo };
  }
}
