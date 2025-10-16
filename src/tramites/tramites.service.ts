// En: src/tramites/tramites.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTramiteDto } from './dto/create-tramite.dto';
import { UpdateTramiteDto } from './dto/update-tramite.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { Oficina, Prisma } from '@prisma/client'; // 1. Importar Prisma
import { FindAllTramitesDto } from './dto/find-all-tramites.dto'; // 2. Importar el DTO

@Injectable()
export class TramitesService {
  constructor(private readonly prisma: PrismaService) {}

  // --- MÉTODO 'findAll' COMPLETAMENTE REFACTORIZADO ---
  async findAll(query: FindAllTramitesDto) {
    const { q, estado, prioridad, page = '1', limit = '10', sortBy } = query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    // 3. Construir cláusula 'where' dinámica
    const where: Prisma.TramiteWhereInput = {};

    if (q) {
      where.OR = [
        { asunto: { contains: q, mode: 'insensitive' } },
        { numeroDocumentoCompleto: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (estado) where.estado = estado;
    if (prioridad) where.prioridad = prioridad;

    // 4. Configurar ordenamiento
    const [sortByField, sortOrder] = sortBy
      ? sortBy.split(':')
      : ['fechaIngreso', 'desc'];
    const orderBy = { [sortByField]: sortOrder as Prisma.SortOrder };

    // 5. Ejecutar consultas para obtener datos y conteo total
    const [tramites, total] = await this.prisma.$transaction([
      this.prisma.tramite.findMany({
        where,
        skip: (pageNumber - 1) * limitNumber,
        take: limitNumber,
        orderBy,
        // 6. Incluir relaciones de forma optimizada
        include: {
          oficinaRemitente: { select: { nombre: true, siglas: true } },
          tipoDocumento: { select: { nombre: true } },
          // Se incluye solo el último movimiento para obtener la ubicación actual
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

    // 7. Devolver una respuesta paginada
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

  // --- El resto de los métodos (`create`, `findOne`, etc.) permanecen igual ---

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
          include: {
            autor: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
    if (!tramite) {
      throw new NotFoundException(`Trámite con ID "${id}" no encontrado`);
    }
    return tramite;
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
}
