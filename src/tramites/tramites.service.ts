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
import { ConfigService } from '@nestjs/config';

type EstadoPlazo = 'VENCIDO' | 'POR_VENCER' | 'A_TIEMPO' | 'NO_APLICA';

@Injectable()
export class TramitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plazoService: PlazoService,
    private readonly configService: ConfigService,
  ) {}

  async findAll(query: FindAllTramitesDto) {
    const {
      q,
      estado,
      prioridad,
      oficinaId,
      tipoDocumentoId,
      fechaRecepcionDesde,
      fechaRecepcionHasta,
      creadoDesde,
      creadoHasta,
      page = '1',
      limit = '10',
      sortBy,
    } = query;

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    const where: Prisma.TramiteWhereInput = {};

    if (q) {
      const terms = q.trim().split(/\s+/);

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

    if (estado && estado.length > 0) where.estado = { in: estado };
    if (prioridad && prioridad.length > 0) where.prioridad = { in: prioridad };
    if (oficinaId && oficinaId.length > 0)
      where.oficinaRemitenteId = { in: oficinaId };
    if (tipoDocumentoId && tipoDocumentoId.length > 0)
      where.tipoDocumentoId = { in: tipoDocumentoId };

    if (fechaRecepcionDesde || fechaRecepcionHasta) {
      where.fechaRecepcion = {};
      if (fechaRecepcionDesde)
        where.fechaRecepcion.gte = new Date(fechaRecepcionDesde);
      if (fechaRecepcionHasta)
        where.fechaRecepcion.lte = new Date(fechaRecepcionHasta);
    }

    if (creadoDesde || creadoHasta) {
      where.fechaIngreso = {};
      if (creadoDesde) where.fechaIngreso.gte = new Date(creadoDesde);
      if (creadoHasta) where.fechaIngreso.lte = new Date(creadoHasta);
    }

    let orderBy: Prisma.TramiteOrderByWithRelationInput = {};

    if (sortBy) {
      const [field, direction] = sortBy.split(':');
      const validFields = [
        'fechaIngreso',
        'fechaRecepcion', // CAMBIO
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

    const [tramitesFromDb, total] = await this.prisma.$transaction([
      this.prisma.tramite.findMany({
        where,
        skip: (pageNumber - 1) * limitNumber,
        take: limitNumber,
        orderBy,
        include: {
          oficinaRemitente: { select: { nombre: true, siglas: true } },
          tipoDocumento: { select: { nombre: true } },
          oficinaDestino: { select: { nombre: true, siglas: true } },
          movimientos: {
            orderBy: { createdAt: 'desc' },
            take: 1,
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
      fechaRecepcion, // CAMBIO: Usamos este campo
      ...tramiteData
    } = createTramiteDto;

    const anio = new Date().getFullYear();
    const tipoDoc = await this.prisma.tipoDocumento.findUniqueOrThrow({
      where: { id: tipoDocumentoId },
    });

    let oficinaUsuarioId = user.oficinaId;
    if (!oficinaUsuarioId) {
      const rootSiglas = this.configService.get<string>('ROOT_OFFICE_SIGLAS');
      if (rootSiglas) {
        const rootOffice = await this.prisma.oficina.findUnique({
          where: { siglas: rootSiglas },
        });
        if (rootOffice) {
          oficinaUsuarioId = rootOffice.id;
        }
      }
    }

    if (!oficinaUsuarioId) {
      throw new BadRequestException(
        'El usuario no tiene oficina asignada y no se pudo determinar la oficina principal (ROOT).',
      );
    }

    // Convertimos el string ISO a Date
    const fechaRecepcionDate = new Date(fechaRecepcion);

    if (tipoRegistro === 'ENVIO') {
      if (!oficinaDestinoId)
        throw new BadRequestException('Falta oficina destino.');

      const jerarquia = await this.obtenerJerarquiaOficina(oficinaUsuarioId);
      const nombreDocumentoCompleto = `${tipoDoc.nombre}-N°-${numeroDocumento}-${anio}-${jerarquia}`;

      try {
        return await this.prisma.$transaction(async (tx) => {
          const tram = await tx.tramite.create({
            data: {
              ...tramiteData,
              asunto,
              numeroDocumento,
              nombreDocumentoCompleto,
              tipoDocumentoId,
              oficinaRemitenteId: oficinaUsuarioId!,
              oficinaDestinoId: oficinaDestinoId,
              fechaRecepcion: fechaRecepcionDate, // CAMBIO
              copias:
                copiasIds && copiasIds.length > 0
                  ? { connect: copiasIds.map((id) => ({ id })) }
                  : undefined,
              estado: EstadoTramite.EN_PROCESO,
            },
          });

          await tx.movimiento.create({
            data: {
              tramiteId: tram.id,
              tipoAccion: TipoAccion.ENVIO,
              usuarioCreadorId: user.id,
              oficinaOrigenId: oficinaUsuarioId!,
              oficinaDestinoId: oficinaDestinoId,
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

    if (tipoRegistro === 'RECEPCION') {
      if (!oficinaRemitenteId)
        throw new BadRequestException('Falta oficina remitente.');

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
            oficinaRemitenteId,
            oficinaDestinoId: oficinaUsuarioId,
            fechaRecepcion: fechaRecepcionDate, // CAMBIO
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
        copias: true,
        movimientos: {
          include: {
            oficinaOrigen: true,
            usuarioCreador: true,
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
    movimientos: { createdAt: Date; fechaMovimiento?: Date }[];
    fechaRecepcion: Date; // CAMBIO
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
        ? tramite.movimientos[tramite.movimientos.length - 1].fechaMovimiento ||
          tramite.movimientos[tramite.movimientos.length - 1].createdAt
        : tramite.fechaRecepcion;

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
