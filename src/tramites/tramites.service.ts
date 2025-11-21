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
      // 1. RECUPERAMOS LOS FILTROS DE FECHA (Antes se ignoraban)
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

    // Inicializamos el objeto Where
    const where: Prisma.TramiteWhereInput = {};

    // 2. BÚSQUEDA INTELIGENTE (Smart Search)
    // Divide "dgi oficio" en ["dgi", "oficio"] y obliga a que CADA término coincida en ALGÚN campo
    if (q) {
      const terms = q.trim().split(/\s+/); // Dividir por espacios

      where.AND = terms.map((term) => ({
        OR: [
          { asunto: { contains: term, mode: 'insensitive' } },
          { numeroDocumentoCompleto: { contains: term, mode: 'insensitive' } },
          // Buscamos también en las relaciones (Magia de Prisma)
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

    // 3. FILTROS DE ARRAY (Exactos)
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

    // 4. FILTROS DE FECHA (Rangos)
    // A. Fecha del Documento (Lo que dice el papel)
    if (fechaDocumentoDesde || fechaDocumentoHasta) {
      where.fechaDocumento = {};
      if (fechaDocumentoDesde) {
        where.fechaDocumento.gte = new Date(fechaDocumentoDesde);
      }
      if (fechaDocumentoHasta) {
        // Ajustamos al final del día si es necesario, o confiamos en el ISO del frontend
        where.fechaDocumento.lte = new Date(fechaDocumentoHasta);
      }
    }

    // B. Fecha de Ingreso/Sistema (Auditoría)
    if (creadoDesde || creadoHasta) {
      where.fechaIngreso = {}; // O 'createdAt' si prefieres la marca de tiempo del sistema
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
        'numeroDocumentoCompleto',
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

    // 6. EJECUCIÓN
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

  // --- (Resto de métodos: create, findOne, update, etc. se mantienen IGUALES) ---
  // ... Asegúrate de mantener el create, findOne, update, remove, y auxiliares que ya tenías ...

  // --- COPIA AQUÍ EL RESTO DE MÉTODOS QUE YA FUNCIONABAN EN TU ARCHIVO ANTERIOR ---
  async create(createTramiteDto: CreateTramiteDto, user: User) {
    // ... (Tu implementación de create corregida anteriormente)
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
