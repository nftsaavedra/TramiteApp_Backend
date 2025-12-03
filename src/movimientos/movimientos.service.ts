import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import { UpdateMovimientoDto } from './dto/update-movimiento.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { Oficina, EstadoTramite, type User } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MovimientosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async create(createMovimientoDto: CreateMovimientoDto, user: User) {
    const {
      tramiteId,
      tipoDocumentoId,
      oficinaDestinoId, // CAMBIO: Destino único directo
      numeroDocumento,
      asunto,
      tipoAccion,
      ...movimientoData
    } = createMovimientoDto;

    const usuarioCreadorId = user.id;
    if (!user.oficinaId) {
      throw new BadRequestException(
        'El usuario autenticado no tiene una oficina asignada para esta acción.',
      );
    }
    const oficinaOrigenId = user.oficinaId;

    const oficinaOrigen = await this.prisma.oficina.findUniqueOrThrow({
      where: { id: oficinaOrigenId },
    });

    // Lógica de validación para Cierre/Archivo
    const esAccionFinal = tipoAccion === 'ARCHIVO' || tipoAccion === 'CIERRE';
    const siglasOficinaRaiz =
      this.configService.get<string>('ROOT_OFFICE_SIGLAS');

    if (esAccionFinal && oficinaOrigen.siglas !== siglasOficinaRaiz) {
      throw new BadRequestException(
        `La acción ${tipoAccion} solo puede ser realizada desde la oficina ${siglasOficinaRaiz}.`,
      );
    }

    // CAMBIO: Validación de destino único
    if (!esAccionFinal && !oficinaDestinoId) {
      throw new BadRequestException(
        'Se debe especificar la oficina de destino para esta acción.',
      );
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
      // 1. Crear el Movimiento (Destino directo)
      const nuevoMovimiento = await tx.movimiento.create({
        data: {
          ...movimientoData,
          tipoAccion,
          // Datos del documento generado en este paso (si aplica)
          numeroDocumento,
          nombreDocumentoCompleto,
          asunto, // Trazabilidad específica

          tramiteId,
          usuarioCreadorId,
          oficinaOrigenId,
          tipoDocumentoId,

          // CAMBIO: Asignación directa del destino (1:1)
          oficinaDestinoId: esAccionFinal ? null : oficinaDestinoId,
        },
      });

      // 2. Actualizar Estado del Trámite si es acción final
      if (esAccionFinal) {
        const nuevoEstado =
          tipoAccion === 'ARCHIVO'
            ? EstadoTramite.ARCHIVADO
            : EstadoTramite.FINALIZADO;

        await tx.tramite.update({
          where: { id: tramiteId },
          data: {
            estado: nuevoEstado,
            fechaCierre: new Date(),
          },
        });
      }

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
