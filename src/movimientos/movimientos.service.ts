import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import { UpdateMovimientoDto } from './dto/update-movimiento.dto';
import { PrismaService } from '@/prisma/prisma.service';
// 1. IMPORTACIÓN CRÍTICA: Agregamos 'EstadoTramite'
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
      destinos,
      numeroDocumento,
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

    const esAccionFinal = tipoAccion === 'ARCHIVO' || tipoAccion === 'CIERRE';
    const siglasOficinaRaiz =
      this.configService.get<string>('ROOT_OFFICE_SIGLAS');

    if (esAccionFinal && oficinaOrigen.siglas !== siglasOficinaRaiz) {
      throw new BadRequestException(
        `La acción ${tipoAccion} solo puede ser realizada desde la oficina ${siglasOficinaRaiz}.`,
      );
    }

    if (!esAccionFinal && (!destinos || destinos.length === 0)) {
      throw new BadRequestException(
        'Se debe especificar al menos un destino para esta acción.',
      );
    }

    let numeroDocumentoCompleto: string | null = null;
    if (tipoDocumentoId && numeroDocumento) {
      const anio = new Date().getFullYear();
      const tipoDoc = await this.prisma.tipoDocumento.findUniqueOrThrow({
        where: { id: tipoDocumentoId },
      });
      const jerarquia = await this.obtenerJerarquiaOficina(oficinaOrigenId);
      numeroDocumentoCompleto = `${tipoDoc.nombre}-N°-${numeroDocumento}-${anio}-${jerarquia}`;
    }

    return this.prisma.$transaction(async (tx) => {
      const nuevoMovimiento = await tx.movimiento.create({
        data: {
          ...movimientoData,
          tipoAccion,
          numeroDocumento,
          numeroDocumentoCompleto,
          tramiteId,
          usuarioCreadorId,
          oficinaOrigenId,
          tipoDocumentoId,
        },
      });

      if (!esAccionFinal && destinos) {
        const destinosData = destinos.map((destino) => ({
          movimientoId: nuevoMovimiento.id,
          oficinaDestinoId: destino.oficinaDestinoId,
          tipoDestino: destino.tipoDestino,
        }));
        await tx.movimientoDestino.createMany({ data: destinosData });
      }

      // --- CORRECCIÓN DEL ERROR DE TIPADO ---
      if (esAccionFinal) {
        // Usamos el Enum real en lugar de strings sueltos
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

      return tx.movimiento.findUnique({
        where: { id: nuevoMovimiento.id },
        include: { destinos: true },
      });
    });
  }

  // ... (Resto de métodos auxiliares findOne, findAll, update, remove se mantienen igual)

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
    return this.prisma.movimiento.findMany();
  }

  async findOne(id: string) {
    const movimiento = await this.prisma.movimiento.findUnique({
      where: { id },
      include: {
        destinos: { include: { oficinaDestino: true } },
      },
    });
    if (!movimiento) {
      throw new NotFoundException(`Movimiento con ID "${id}" no encontrado`);
    }
    return movimiento;
  }

  async update(id: string, updateMovimientoDto: UpdateMovimientoDto) {
    await this.findOne(id);
    return `This action updates a #${id} movimiento`;
  }

  async remove(id: string) {
    throw new Error('La eliminación de movimientos no está permitida.');
  }
}
