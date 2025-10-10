import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import { UpdateMovimientoDto } from './dto/update-movimiento.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { Oficina } from '@prisma/client';

@Injectable()
export class MovimientosService {
  constructor(private readonly prisma: PrismaService) {}

  // --- MÉTODO 'create' REESTRUCTURADO ---
  async create(
    createMovimientoDto: CreateMovimientoDto,
    usuarioCreadorId: string,
    oficinaOrigenId: string,
  ) {
    const {
      tramiteId,
      tipoDocumentoId,
      destinos,
      numeroDocumento,
      ...movimientoData
    } = createMovimientoDto;

    // Validaciones
    if (!destinos || destinos.length === 0) {
      throw new BadRequestException('Se debe especificar al menos un destino.');
    }
    await this.prisma.tramite.findUniqueOrThrow({ where: { id: tramiteId } });

    let numeroDocumentoCompleto: string | null = null;

    // 1. Si el movimiento tiene un documento (y un número), construimos el nombre completo
    if (tipoDocumentoId && numeroDocumento) {
      const anio = new Date().getFullYear();
      const tipoDoc = await this.prisma.tipoDocumento.findUniqueOrThrow({
        where: { id: tipoDocumentoId },
      });
      const jerarquia = await this.obtenerJerarquiaOficina(oficinaOrigenId);

      numeroDocumentoCompleto = `${tipoDoc.nombre}-N°-${numeroDocumento}-${anio}-${jerarquia}`;
    }

    // 2. Usamos una transacción para garantizar la atomicidad
    return this.prisma.$transaction(async (tx) => {
      const nuevoMovimiento = await tx.movimiento.create({
        data: {
          ...movimientoData,
          numeroDocumento,
          numeroDocumentoCompleto,
          tramiteId,
          usuarioCreadorId,
          oficinaOrigenId,
          tipoDocumentoId,
        },
      });

      const destinosData = destinos.map((destino) => ({
        movimientoId: nuevoMovimiento.id,
        oficinaDestinoId: destino.oficinaDestinoId,
        tipoDestino: destino.tipoDestino,
      }));

      await tx.movimientoDestino.createMany({ data: destinosData });

      return tx.movimiento.findUnique({
        where: { id: nuevoMovimiento.id },
        include: { destinos: true },
      });
    });
  }

  // --- FUNCIÓN AUXILIAR PARA LA JERARQUÍA ---
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

  // ... (métodos findAll, findOne, update, remove sin cambios) ...
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
