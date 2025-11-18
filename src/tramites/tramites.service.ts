// En: src/tramites/tramites.service.ts

import {
  Injectable,
  NotFoundException,
  // --- IMPORTACIONES AÑADIDAS ---
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateTramiteDto } from './dto/create-tramite.dto';
import { UpdateTramiteDto } from './dto/update-tramite.dto';
import { PrismaService } from '@/prisma/prisma.service';
// --- IMPORTACIONES MODIFICADAS ---
import { Oficina, Prisma, TipoAccion, type User } from '@prisma/client'; // 1. Importar Prisma, TipoAccion y 'type User'
import { FindAllTramitesDto } from './dto/find-all-tramites.dto'; // 2. Importar el DTO
import { PlazoService } from '@/common/plazo/plazo.service';

type EstadoPlazo = 'VENCIDO' | 'POR_VENCER' | 'A_TIEMPO' | 'NO_APLICA';

@Injectable()
export class TramitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plazoService: PlazoService,
  ) {}

  // --- El método findAll se mantiene 100% igual al que proveyó ---
  async findAll(query: FindAllTramitesDto) {
    // Usamos el DTO actualizado
    const {
      q,
      estado,
      prioridad,
      oficinaId,
      tipoDocumentoId,
      page = '1',
      limit = '10',
      sortBy,
    } = query;

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    const where: Prisma.TramiteWhereInput = {};

    // 1. Búsqueda de Texto (Asunto o Número)
    if (q) {
      where.OR = [
        { asunto: { contains: q, mode: 'insensitive' } },
        { numeroDocumentoCompleto: { contains: q, mode: 'insensitive' } },
      ];
    }

    // 2. Filtros Múltiples (Arrays)
    // Prisma usa la sintaxis { in: array } para filtrar múltiples valores
    if (estado && estado.length > 0) {
      where.estado = { in: estado };
    }

    if (prioridad && prioridad.length > 0) {
      where.prioridad = { in: prioridad };
    }

    if (oficinaId && oficinaId.length > 0) {
      // Filtramos por la oficina remitente original
      where.oficinaRemitenteId = { in: oficinaId };
    }

    if (tipoDocumentoId && tipoDocumentoId.length > 0) {
      where.tipoDocumentoId = { in: tipoDocumentoId };
    }

    // 3. Ordenamiento Dinámico
    let orderBy: Prisma.TramiteOrderByWithRelationInput = {
      fechaIngreso: 'desc',
    };
    if (sortBy) {
      const [field, direction] = sortBy.split(':');
      // Mapeo de campos permitidos para evitar errores de SQL
      const validFields = [
        'fechaIngreso',
        'fechaDocumento',
        'prioridad',
        'estado',
        'numeroDocumento',
      ];
      if (validFields.includes(field)) {
        orderBy = { [field]: direction as Prisma.SortOrder };
      }
    }

    // 4. Ejecución de la Consulta
    const [tramitesFromDb, total] = await this.prisma.$transaction([
      this.prisma.tramite.findMany({
        where,
        skip: (pageNumber - 1) * limitNumber,
        take: limitNumber,
        orderBy,
        include: {
          oficinaRemitente: { select: { nombre: true, siglas: true } },
          tipoDocumento: { select: { nombre: true } },
          // Incluimos solo lo necesario de movimientos para calcular plazos
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

    // 5. Cálculo de Plazos (Lógica existente preservada)
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

  // --- INICIO DE LA MODIFICACIÓN: MÉTODO CREATE ---
  async create(createTramiteDto: CreateTramiteDto, user: User) {
    const {
      tipoRegistro,
      tipoDocumentoId,
      oficinaRemitenteId,
      oficinaDestinoId,
      numeroDocumento,
      ...tramiteData
    } = createTramiteDto;

    const anio = new Date().getFullYear();

    const tipoDoc = await this.prisma.tipoDocumento.findUniqueOrThrow({
      where: { id: tipoDocumentoId },
    });

    // --- Flujo 2: ENVÍO (Trámite Interno) ---
    if (tipoRegistro === 'ENVIO') {
      if (!oficinaDestinoId) {
        throw new BadRequestException(
          'oficinaDestinoId es requerido para el tipo de registro ENVIO.',
        );
      }

      // --- INICIO DE LA CORRECCIÓN DE TIPO (TS:2322) ---
      // 1. Validamos que el 'user.oficinaId' (string | null) exista
      if (!user.oficinaId) {
        throw new BadRequestException(
          'El usuario autenticado no tiene una oficina asignada para esta acción.',
        );
      }
      // 2. Asignamos el valor (ahora 'string') a una constante segura
      const oficinaUsuarioId = user.oficinaId;
      // --- FIN DE LA CORRECCIÓN ---

      // 3. Obtener jerarquía (usando la constante segura)
      const jerarquia = await this.obtenerJerarquiaOficina(oficinaUsuarioId);
      const numeroDocumentoCompleto = `${tipoDoc.nombre}-N°-${numeroDocumento}-${anio}-${jerarquia}`;

      // 4. Iniciar Transacción
      try {
        return await this.prisma.$transaction(async (tx) => {
          // A. Crear el Trámite
          const tramite = await tx.tramite.create({
            data: {
              ...tramiteData,
              numeroDocumento,
              numeroDocumentoCompleto,
              tipoDocumentoId,
              // Usamos la constante segura (string)
              oficinaRemitenteId: oficinaUsuarioId,
            },
          });

          // B. Crear el primer Movimiento (DERIVACION)
          const movimiento = await tx.movimiento.create({
            data: {
              tramiteId: tramite.id,
              tipoAccion: TipoAccion.DERIVACION,
              usuarioCreadorId: user.id,
              // Usamos la constante segura (string)
              oficinaOrigenId: oficinaUsuarioId,
              notas: tramiteData.notas ?? 'Inicio de trámite.',
            },
          });

          // C. Crear el Destino del movimiento
          await tx.movimientoDestino.create({
            data: {
              movimientoId: movimiento.id,
              oficinaDestinoId: oficinaDestinoId,
              tipoDestino: 'PRINCIPAL',
            },
          });

          return tramite;
        });
      } catch (error) {
        console.error('Error en transacción de creación de trámite:', error);
        throw new InternalServerErrorException(
          'Error al crear el trámite y primer movimiento.',
        );
      }
    }

    // --- Flujo 1: RECEPCIÓN (Trámite Externo - Lógica original) ---
    if (tipoRegistro === 'RECEPCION') {
      if (!oficinaRemitenteId) {
        throw new BadRequestException(
          'oficinaRemitenteId es requerido para el tipo de registro RECEPCION.',
        );
      }

      const jerarquia = await this.obtenerJerarquiaOficina(oficinaRemitenteId);
      const numeroDocumentoCompleto = `${tipoDoc.nombre}-N°-${numeroDocumento}-${anio}-${jerarquia}`;

      try {
        return this.prisma.tramite.create({
          data: {
            ...tramiteData,
            numeroDocumento,
            numeroDocumentoCompleto,
            tipoDocumentoId,
            oficinaRemitenteId: oficinaRemitenteId,
          },
        });
      } catch (error) {
        console.error('Error en creación simple de trámite:', error);
        throw new InternalServerErrorException(
          'Error al crear el trámite de recepción.',
        );
      }
    }

    throw new BadRequestException('tipoRegistro debe ser RECEPCION o ENVIO.');
  }
  // --- FIN DE LA MODIFICACIÓN ---

  // --- El método obtenerJerarquiaOficina se mantiene 100% igual ---
  private async obtenerJerarquiaOficina(oficinaId: string): Promise<string> {
    // ... (Lógica idéntica a la provista) ...
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

  // --- El método findOne se mantiene 100% igual ---
  async findOne(id: string) {
    // ... (Lógica idéntica a la provista) ...
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

  // --- El método update se mantiene 100% igual ---
  async update(id: string, updateTramiteDto: UpdateTramiteDto) {
    await this.findOne(id);
    return this.prisma.tramite.update({
      where: { id },
      data: updateTramiteDto,
    });
  }

  // --- El método remove se mantiene 100% igual ---
  async remove(id: string) {
    throw new Error(
      'La eliminación de trámites no está permitida. Se debe archivar o cerrar.',
    );
  }

  // --- El método getPlazoInfo se mantiene 100% igual ---
  private getPlazoInfo(tramite: {
    estado: string;
    movimientos: { createdAt: Date }[];
    fechaIngreso: Date;
  }): { diasTranscurridos: number | null; estadoPlazo: EstadoPlazo } {
    // ... (Lógica idéntica a la provista) ...
    if (tramite.estado !== 'ABIERTO') {
      return { diasTranscurridos: null, estadoPlazo: 'NO_APLICA' };
    }

    let fechaReferencia: Date;
    if (tramite.movimientos?.length > 0) {
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
