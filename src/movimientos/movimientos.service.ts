import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import { UpdateMovimientoDto } from './dto/update-movimiento.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { Oficina, EstadoTramite, TipoAccion, type User } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MovimientosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async create(createMovimientoDto: CreateMovimientoDto, user: User) {
    let {
      tramiteId,
      tipoDocumentoId,
      oficinaDestinoId, // CAMBIO: Destino único directo
      numeroDocumento,
      asunto,
      tipoAccion,
      ...movimientoData
    } = createMovimientoDto;

    const usuarioCreadorId = user.id;

    // LÓGICA DE ORIGEN BASADA EN HISTORIAL (Cadena de Custodia)
    // El origen del nuevo movimiento es el destino del último movimiento.
    const ultimoMovimiento = await this.prisma.movimiento.findFirst({
      where: { tramiteId },
      orderBy: { createdAt: 'desc' },
    });

    let oficinaOrigenId: string;

    if (ultimoMovimiento) {
      // Si existe un movimiento previo, el documento está en la oficina destino de ese movimiento.
      // Si no hubo destino (ej. acción interna), sigue en la oficina origen de ese movimiento.
      oficinaOrigenId =
        ultimoMovimiento.oficinaDestinoId || ultimoMovimiento.oficinaOrigenId;
    } else {
      // Si es el primer movimiento, el origen es la Oficina Raíz (VPIN/Mesa de Partes)
      const siglasOficinaRaiz =
        this.configService.get<string>('ROOT_OFFICE_SIGLAS') || 'VPIN';
      const oficinaRaiz = await this.prisma.oficina.findUnique({
        where: { siglas: siglasOficinaRaiz },
      });

      if (!oficinaRaiz) {
        throw new NotFoundException(
          `La oficina raíz (${siglasOficinaRaiz}) no está configurada en el sistema.`,
        );
      }
      oficinaOrigenId = oficinaRaiz.id;
    }

    const oficinaOrigen = await this.prisma.oficina.findUniqueOrThrow({
      where: { id: oficinaOrigenId },
    });

    // Validación estricta de TipoAccion
    if (!tipoAccion) {
      throw new BadRequestException(
        'El tipo de acción es obligatorio (ENVIO o RECEPCION).',
      );
    }

    // Validación de destino para ENVIO
    if (tipoAccion === TipoAccion.ENVIO && !oficinaDestinoId) {
      throw new BadRequestException(
        'Se debe especificar la oficina de destino para un ENVIO.',
      );
    }

    // Default destino para RECEPCION
    if (tipoAccion === TipoAccion.RECEPCION && !oficinaDestinoId) {
      const siglasOficinaRaiz =
        this.configService.get<string>('ROOT_OFFICE_SIGLAS') || 'VPIN';
      const oficinaRaiz = await this.prisma.oficina.findUnique({
        where: { siglas: siglasOficinaRaiz },
      });

      if (!oficinaRaiz) {
        throw new BadRequestException(
          `No se pudo determinar la oficina de destino (Oficina Raíz ${siglasOficinaRaiz} no encontrada).`,
        );
      }
      oficinaDestinoId = oficinaRaiz.id;
    }

    // LÓGICA DE GENERACIÓN DE NOMBRE (Igual que en Trámites)
    let nombreDocumentoCompleto: string | null = null;

    if (tipoDocumentoId && numeroDocumento) {
      const anio = new Date().getFullYear();
      const tipoDoc = await this.prisma.tipoDocumento.findUniqueOrThrow({
        where: { id: tipoDocumentoId },
      });
      const jerarquia = await this.obtenerJerarquiaOficina(oficinaOrigenId);
      // Formato estandarizado
      nombreDocumentoCompleto = `${tipoDoc.nombre}-N°-${numeroDocumento}-${anio}-${jerarquia}`;
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Crear el Movimiento
      const nuevoMovimiento = await tx.movimiento.create({
        data: {
          ...movimientoData,
          tipoAccion: tipoAccion,
          // Datos del documento generado en este paso (si aplica)
          numeroDocumento,
          nombreDocumentoCompleto,
          asunto, // Trazabilidad específica

          tramiteId,
          usuarioCreadorId,
          oficinaOrigenId,
          tipoDocumentoId,

          oficinaDestinoId,

          fechaMovimiento: movimientoData.fechaMovimiento
            ? new Date(movimientoData.fechaMovimiento)
            : new Date(),
        },
      });

      // 2. Actualizar Estado del Trámite (Ya no hay CIERRE/ARCHIVO explícito en el enum,
      // pero si se requiere lógica de cierre, se debería manejar por otro flag o estado).
      // Por ahora, eliminamos la lógica de cierre automático basada en TipoAccion antiguo.

      // Retornamos el movimiento con sus relaciones para la UI
      return tx.movimiento.findUnique({
        where: { id: nuevoMovimiento.id },
        include: {
          oficinaDestino: true,
          oficinaOrigen: true,
          usuarioCreador: true,
          tipoDocumento: true,
        },
      });
    });
  }

  // Helper para generar la identidad del documento
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

  async findAll() {
    return this.prisma.movimiento.findMany({
      include: {
        oficinaOrigen: true,
        oficinaDestino: true,
      },
    });
  }

  async findOne(id: string) {
    const movimiento = await this.prisma.movimiento.findUnique({
      where: { id },
      include: {
        oficinaOrigen: true,
        oficinaDestino: true,
        usuarioCreador: true,
        tipoDocumento: true,
        anotaciones: true, // Incluimos anotaciones relacionadas
      },
    });
    if (!movimiento) {
      throw new NotFoundException(`Movimiento con ID "${id}" no encontrado`);
    }
    return movimiento;
  }

  async update(id: string, updateMovimientoDto: UpdateMovimientoDto) {
    await this.findOne(id);
    // Aquí iría la lógica de actualización si se permitiera editar movimientos
    return `This action updates a #${id} movimiento`;
  }

  async remove(id: string) {
    throw new Error(
      'La eliminación de movimientos no está permitida por auditoría.',
    );
  }
}
