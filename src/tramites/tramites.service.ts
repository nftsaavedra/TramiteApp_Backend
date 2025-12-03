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
      fechaDocumentoDesde,
      fechaDocumentoHasta,
      creadoDesde,
      creadoHasta,
      page = '1',
      limit = '10',
      sortBy,
    } = query;

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    const where: Prisma.TramiteWhereInput = {};

    // 2. BÚSQUEDA INTELIGENTE
    if (q) {
      const terms = q.trim().split(/\s+/); // Dividir por espacios

      where.AND = terms.map((term) => ({
        OR: [
          { asunto: { contains: term, mode: 'insensitive' } },
          { nombreDocumentoCompleto: { contains: term, mode: 'insensitive' } },
          {
            oficinaRemitente: {
              siglas: { contains: term, mode: 'insensitive' },
            },
          },
          {
            oficinaRemitente: {
              nombre: { contains: term, mode: 'insensitive' },
            },
          },
          {
            tipoDocumento: { nombre: { contains: term, mode: 'insensitive' } },
          },
        ],
      }));
    }

    // 3. FILTROS EXACTOS
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

    // 4. FILTROS DE FECHA
    if (fechaDocumentoDesde || fechaDocumentoHasta) {
      where.fechaDocumento = {};
      if (fechaDocumentoDesde) {
        where.fechaDocumento.gte = new Date(fechaDocumentoDesde);
      }
      if (fechaDocumentoHasta) {
        where.fechaDocumento.lte = new Date(fechaDocumentoHasta);
      }
    }

    if (creadoDesde || creadoHasta) {
      where.fechaIngreso = {};
      if (creadoDesde) {
        where.fechaIngreso.gte = new Date(creadoDesde);
      }
      if (creadoHasta) {
        where.fechaIngreso.lte = new Date(creadoHasta);
      }
    }

    // 5. ORDENAMIENTO
    let orderBy: Prisma.TramiteOrderByWithRelationInput = {};

    if (sortBy) {
      const [field, direction] = sortBy.split(':');
      const validFields = [
        'fechaIngreso',
        'fechaDocumento',
        'prioridad',
        'estado',
        'numeroDocumento',
        'nombreDocumentoCompleto',
        'asunto',
      ];

      if (validFields.includes(field)) {
        orderBy = { [field]: direction as Prisma.SortOrder };
      } else {
        orderBy = { fechaIngreso: 'desc' };
      }
    } else {
      orderBy = { fechaIngreso: 'desc' };
    }

    // 6. EJECUCIÓN CON RELACIONES ACTUALIZADAS
    const [tramitesFromDb, total] = await this.prisma.$transaction([
      this.prisma.tramite.findMany({
        where,
        skip: (pageNumber - 1) * limitNumber,
        take: limitNumber,
        orderBy,
        include: {
          oficinaRemitente: { select: { nombre: true, siglas: true } },
          tipoDocumento: { select: { nombre: true } },
          // Incluimos el destino principal para saber a dónde va el trámite globalmente
          oficinaDestino: { select: { nombre: true, siglas: true } },
          movimientos: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            // Incluimos el destino del último movimiento
            include: {
              oficinaDestino: { select: { nombre: true, siglas: true } },
              oficinaOrigen: { select: { nombre: true, siglas: true } },
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

  async create(createTramiteDto: CreateTramiteDto, user: User) {
    const {
      tipoRegistro,
      tipoDocumentoId,
      oficinaRemitenteId,
      oficinaDestinoId,
      numeroDocumento,
      asunto,
      copiasIds,
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

    // CASO 1: ENVÍO (Salida de documento)
    // Regla de Negocio: Se crea el Trámite Y el Primer Movimiento (Derivación)
    if (tipoRegistro === 'ENVIO') {
      if (!oficinaDestinoId)
        throw new BadRequestException('Falta oficina destino.');

      // Generamos el correlativo jerárquico (Ej: OFICIO-001-2025-VPIN/DGI)
      const jerarquia = await this.obtenerJerarquiaOficina(oficinaUsuarioId);
      const nombreDocumentoCompleto = `${tipoDoc.nombre}-N°-${numeroDocumento}-${anio}-${jerarquia}`;

      try {
        return await this.prisma.$transaction(async (tx) => {
          // 1. Crear el Trámite (La carpeta del expediente)
          const tram = await tx.tramite.create({
            data: {
              ...tramiteData,
              asunto,
              numeroDocumento,
              nombreDocumentoCompleto,
              tipoDocumentoId,
              oficinaRemitenteId: oficinaUsuarioId, // Yo soy el remitente
              oficinaDestinoId: oficinaDestinoId, // Va para X oficina
              // Registro de Copias (Informativo)
              copias:
                copiasIds && copiasIds.length > 0
                  ? { connect: copiasIds.map((id) => ({ id })) }
                  : undefined,
              estado: EstadoTramite.EN_PROCESO,
            },
          });

          // 2. Crear el Primer Movimiento (La acción de enviar/derivar)
          // Esto es obligatorio en un ENVÍO para que aparezca en "Enviados" y "Por Recibir" del destino.
          await tx.movimiento.create({
            data: {
              tramiteId: tram.id,
              tipoAccion: TipoAccion.DERIVACION, // Acción inicial por defecto
              usuarioCreadorId: user.id,
              oficinaOrigenId: oficinaUsuarioId,
              oficinaDestinoId: oficinaDestinoId, // Destino directo

              // Trazabilidad completa del movimiento inicial
              asunto: asunto,
              nombreDocumentoCompleto: nombreDocumentoCompleto,
              notas: 'Inicio de trámite (Envío).',
            },
          });

          return tram;
        });
      } catch (e) {
        console.error(e);
        throw new InternalServerErrorException('Error al crear envío.');
      }
    }

    // CASO 2: RECEPCIÓN (Entrada de documento externo)
    // Regla de Negocio: Solo se crea el Trámite. NO hay movimiento todavía.
    // El documento "reposa" en la oficina hasta que alguien lo gestione.
    if (tipoRegistro === 'RECEPCION') {
      if (!oficinaRemitenteId)
        throw new BadRequestException('Falta oficina remitente.');

      // En recepción, el documento viene de fuera, usamos la jerarquía del remitente (si es interno)
      // o generamos una referencia simple si es puramente externo (dependerá de tu lógica de negocio futura)
      const jerarquia = await this.obtenerJerarquiaOficina(oficinaRemitenteId);
      const nombreDocumentoCompleto = `${tipoDoc.nombre}-N°-${numeroDocumento}-${anio}-${jerarquia}`;

      try {
        return await this.prisma.tramite.create({
          data: {
            ...tramiteData,
            asunto,
            numeroDocumento,
            nombreDocumentoCompleto,
            tipoDocumentoId,
            oficinaRemitenteId, // Viene de afuera

            // IMPORTANTE: En una recepción, el destino inicial soy YO (mi oficina),
            // porque el documento llegó aquí.
            oficinaDestinoId: oficinaUsuarioId,

            estado: EstadoTramite.EN_PROCESO,
            // No creamos movimiento aquí. El historial iniciará vacío indicando "En Bandeja de Entrada".
          },
        });
      } catch (e) {
        console.error(e);
        throw new InternalServerErrorException('Error al crear recepción.');
      }
    }

    throw new BadRequestException('Tipo de registro inválido.');
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
        // Incluimos las copias para ver a quiénes más se notificó
        copias: true,
        movimientos: {
          include: {
            oficinaOrigen: true,
            usuarioCreador: true,
            // Incluimos el destino del movimiento
            oficinaDestino: true,
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
