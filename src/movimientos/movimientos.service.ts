// En: src/movimientos/movimientos.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import { UpdateMovimientoDto } from './dto/update-movimiento.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { Oficina } from '@prisma/client';
import { ConfigService } from '@nestjs/config'; // 1. Importa ConfigService

@Injectable()
export class MovimientosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService, // 2. Inyéctalo
  ) {}

  // --- MÉTODO 'create' COMPLETAMENTE REFACTORIZADO ---
  async create(
    createMovimientoDto: CreateMovimientoDto,
    usuarioCreadorId: string,
  ) {
    const {
      tramiteId,
      tipoDocumentoId,
      destinos,
      numeroDocumento,
      tipoAccion, // Extrae tipoAccion para las validaciones
      ...movimientoData
    } = createMovimientoDto;

    // --- INICIO: LÓGICA DE NEGOCIO MEJORADA ---

    // 1. Obtener el trámite y su último movimiento en una sola consulta
    const tramite = await this.prisma.tramite.findUniqueOrThrow({
      where: { id: tramiteId },
      include: {
        movimientos: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            destinos: {
              take: 1, // Asumimos que el primer destino es el principal
            },
          },
        },
      },
    });

    // 2. Determinar la oficina de origen
    let oficinaOrigenId: string;
    const ultimoMovimiento = tramite.movimientos[0];

    if (ultimoMovimiento && ultimoMovimiento.destinos[0]) {
      // Si hay un movimiento previo, el origen es el destino de ese movimiento
      oficinaOrigenId = ultimoMovimiento.destinos[0].oficinaDestinoId;
    } else {
      // Si es el primer movimiento, el origen es la oficina remitente del trámite
      oficinaOrigenId = tramite.oficinaRemitenteId;
    }

    const oficinaOrigen = await this.prisma.oficina.findUniqueOrThrow({
      where: { id: oficinaOrigenId },
    });

    // 3. Aplicar reglas de negocio
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

    // --- FIN: LÓGICA DE NEGOCIO MEJORADA ---

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
          tipoAccion, // Añade tipoAccion a los datos
          numeroDocumento,
          numeroDocumentoCompleto,
          tramiteId,
          usuarioCreadorId,
          oficinaOrigenId, // Usa el ID calculado
          tipoDocumentoId,
        },
      });

      // Solo crea destinos si la acción no es final
      if (!esAccionFinal && destinos) {
        const destinosData = destinos.map((destino) => ({
          movimientoId: nuevoMovimiento.id,
          oficinaDestinoId: destino.oficinaDestinoId,
          tipoDestino: destino.tipoDestino,
        }));
        await tx.movimientoDestino.createMany({ data: destinosData });
      }

      return tx.movimiento.findUnique({
        where: { id: nuevoMovimiento.id },
        include: { destinos: true },
      });
    });
  }

  // ... (resto de los métodos sin cambios) ...
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
