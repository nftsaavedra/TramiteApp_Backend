import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateTramiteDto } from './dto/create-tramite.dto';
import { UpdateTramiteDto } from './dto/update-tramite.dto';
import { PrismaService } from '@/prisma/prisma.service';
import {
  Oficina,
  Prisma,
  TipoAccion,
  type User,
  EstadoTramite,
} from '@prisma/client';
import { FindAllTramitesDto } from './dto/find-all-tramites.dto';
import { PlazoService } from '@/common/plazo/plazo.service';

type EstadoPlazo = 'VENCIDO' | 'POR_VENCER' | 'A_TIEMPO' | 'NO_APLICA';

@Injectable()
export class TramitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plazoService: PlazoService,
  ) {}

  async findAll(query: FindAllTramitesDto) {
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

    // 1. Búsqueda de Texto
    if (q) {
      where.OR = [
        { asunto: { contains: q, mode: 'insensitive' } },
        { numeroDocumentoCompleto: { contains: q, mode: 'insensitive' } },
      ];
    }

    // 2. Filtros
    if (estado && estado.length > 0) {
      where.estado = { in: estado };
    }
    if (prioridad && prioridad.length > 0) {
      where.prioridad = { in: prioridad };
    }
    if (oficinaId && oficinaId.length > 0) {
      where.oficinaRemitenteId = { in: oficinaId };
    }
    if (tipoDocumentoId && tipoDocumentoId.length > 0) {
      where.tipoDocumentoId = { in: tipoDocumentoId };
    }

    // 3. ORDENAMIENTO (Lógica de Negocio Mejorada - Triaje)
    let orderBy:
      | Prisma.TramiteOrderByWithRelationInput
      | Prisma.TramiteOrderByWithRelationInput[];

    if (sortBy) {
      // Si el usuario fuerza un orden (click en columna), lo respetamos
      const [field, direction] = sortBy.split(':');
      const validFields = [
        'fechaIngreso',
        'fechaDocumento',
        'prioridad',
        'estado',
        'numeroDocumento',
        'numeroDocumentoCompleto',
        'asunto',
      ];

      if (validFields.includes(field)) {
        orderBy = { [field]: direction as Prisma.SortOrder };
      } else {
        orderBy = { fechaIngreso: 'desc' };
      }
    } else {
      // --- ORDENAMIENTO POR DEFECTO (EL CEREBRO DEL SISTEMA) ---
      // Regla 1: Segregación de Estado.
      // Usamos 'fechaCierre' con 'nulls: first'.
      // Esto pone TODOS los trámites activos (fechaCierre: null) al principio de la lista.
      // Los finalizados/archivados se van al fondo automáticamente.

      // Regla 2: Prioridad.
      // Dentro de los activos, lo URGENTE va primero.
      // (Postgres respeta el orden del Enum: BAJA < NORMAL < ALTA < URGENTE)

      // Regla 3: Antigüedad.
      // Si tienen misma prioridad, el más antiguo va primero (FIFO) para evitar rezagos.

      orderBy = [
        { fechaCierre: { sort: 'asc', nulls: 'first' } },
        { prioridad: 'desc' },
        { fechaIngreso: 'asc' },
      ];
    }

    // 4. Ejecución
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

  // --- MÉTODO CREATE (Preservado) ---
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

    if (!user.oficinaId) {
      throw new BadRequestException('El usuario no tiene oficina asignada.');
    }
    const oficinaUsuarioId = user.oficinaId;

    if (tipoRegistro === 'ENVIO') {
      if (!oficinaDestinoId)
        throw new BadRequestException('Falta oficina destino.');

      const jerarquia = await this.obtenerJerarquiaOficina(oficinaUsuarioId);
      const numeroDocumentoCompleto = `${tipoDoc.nombre}-N°-${numeroDocumento}-${anio}-${jerarquia}`;

      try {
        return await this.prisma.$transaction(async (tx) => {
          const tram = await tx.tramite.create({
            data: {
              ...tramiteData,
              numeroDocumento,
              numeroDocumentoCompleto,
              tipoDocumentoId,
              oficinaRemitenteId: oficinaUsuarioId,
              estado: EstadoTramite.EN_PROCESO,
              // fechaCierre se queda en null por defecto (Activo)
            },
          });

          const mov = await tx.movimiento.create({
            data: {
              tramiteId: tram.id,
              tipoAccion: TipoAccion.DERIVACION,
              usuarioCreadorId: user.id,
              oficinaOrigenId: oficinaUsuarioId,
              notas: tram.notas ?? 'Inicio de trámite.',
            },
          });

          await tx.movimientoDestino.create({
            data: {
              movimientoId: mov.id,
              oficinaDestinoId: oficinaDestinoId,
              tipoDestino: 'PRINCIPAL',
            },
          });
          return tram;
        });
      } catch (e) {
        console.error(e);
        throw new InternalServerErrorException('Error al crear envío.');
      }
    }

    if (tipoRegistro === 'RECEPCION') {
      if (!oficinaRemitenteId)
        throw new BadRequestException('Falta oficina remitente.');

      const jerarquia = await this.obtenerJerarquiaOficina(oficinaRemitenteId);
      const numeroDocumentoCompleto = `${tipoDoc.nombre}-N°-${numeroDocumento}-${anio}-${jerarquia}`;

      try {
        return await this.prisma.tramite.create({
          data: {
            ...tramiteData,
            numeroDocumento,
            numeroDocumentoCompleto,
            tipoDocumentoId,
            oficinaRemitenteId,
            estado: EstadoTramite.EN_PROCESO,
          },
        });
      } catch (e) {
        console.error(e);
        throw new InternalServerErrorException('Error al crear recepción.');
      }
    }

    throw new BadRequestException('Tipo de registro inválido.');
  }

  // --- AUXILIARES (Preservados) ---

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
            destinos: { include: { oficinaDestino: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        anotaciones: {
          include: { autor: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!tramite) throw new NotFoundException(`Trámite ${id} no encontrado`);

    const { diasTranscurridos, estadoPlazo } = this.getPlazoInfo(
      tramite as any,
    );
    return { ...tramite, plazo: { diasTranscurridos, estado: estadoPlazo } };
  }

  async update(id: string, updateTramiteDto: UpdateTramiteDto) {
    await this.findOne(id);
    return this.prisma.tramite.update({
      where: { id },
      data: updateTramiteDto,
    });
  }

  async remove(id: string) {
    throw new Error('Eliminación no permitida. Use Archivar o Cerrar.');
  }

  private getPlazoInfo(tramite: {
    estado: string;
    movimientos: { createdAt: Date }[];
    fechaIngreso: Date;
  }) {
    // Solo calculamos plazo si está EN_PROCESO (o ABIERTO para compatibilidad legacy)
    if (tramite.estado !== 'EN_PROCESO' && tramite.estado !== 'ABIERTO') {
      return {
        diasTranscurridos: null,
        estadoPlazo: 'NO_APLICA' as EstadoPlazo,
      };
    }
    let fechaReferencia =
      tramite.movimientos?.length > 0
        ? tramite.movimientos[tramite.movimientos.length - 1].createdAt
        : tramite.fechaIngreso;

    const diasTranscurridos = this.plazoService.calcularDiasHabiles(
      fechaReferencia,
      new Date(),
    );

    let estadoPlazo: EstadoPlazo = 'A_TIEMPO';
    if (diasTranscurridos >= 7) estadoPlazo = 'VENCIDO';
    else if (diasTranscurridos >= 5) estadoPlazo = 'POR_VENCER';

    return { diasTranscurridos, estadoPlazo };
  }
}
