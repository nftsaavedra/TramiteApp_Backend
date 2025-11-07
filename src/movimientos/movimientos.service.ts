// En: src/movimientos/movimientos.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import { UpdateMovimientoDto } from './dto/update-movimiento.dto';
import { PrismaService } from '@/prisma/prisma.service';
// --- IMPORTACIONES MODIFICADAS ---
import { Oficina, type User } from '@prisma/client'; // 1. Importar 'type User'
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MovimientosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  // --- INICIO DE LA MODIFICACIÓN: MÉTODO CREATE ---
  async create(
    createMovimientoDto: CreateMovimientoDto,
    user: User, // 2. Firma actualizada para recibir el objeto User completo
  ) {
    const {
      tramiteId,
      tipoDocumentoId,
      destinos,
      numeroDocumento,
      tipoAccion,
      ...movimientoData
    } = createMovimientoDto;

    // --- INICIO: LÓGICA DE NEGOCIO CORREGIDA ---

    // 3. Aplicar la corrección de tipo (Retroalimentación)
    const usuarioCreadorId = user.id;
    if (!user.oficinaId) {
      throw new BadRequestException(
        'El usuario autenticado no tiene una oficina asignada para esta acción.',
      );
    }
    // 4. oficinaOrigenId ahora es seguro (tipo 'string') y lógicamente correcto
    const oficinaOrigenId = user.oficinaId;

    // 5. Obtener la oficina de origen para validaciones
    // (Esta consulta simple reemplaza la lógica compleja anterior [líneas 43-62 del original])
    const oficinaOrigen = await this.prisma.oficina.findUniqueOrThrow({
      where: { id: oficinaOrigenId },
    });

    // 6. Aplicar reglas de negocio (Lógica existente conservada)
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

    // --- FIN: LÓGICA DE NEGOCIO CORREGIDA ---

    let numeroDocumentoCompleto: string | null = null;
    if (tipoDocumentoId && numeroDocumento) {
      const anio = new Date().getFullYear();
      const tipoDoc = await this.prisma.tipoDocumento.findUniqueOrThrow({
        where: { id: tipoDocumentoId },
      });
      // 7. 'obtenerJerarquiaOficina' usa el 'oficinaOrigenId' correcto
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
          usuarioCreadorId, // Derivado de user.id
          oficinaOrigenId, // Derivado de user.oficinaId (seguro)
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

      // 8. (MEJORA) Actualizar estado del trámite si es ARCHIVO o CIERRE
      if (esAccionFinal) {
        await tx.tramite.update({
          where: { id: tramiteId },
          data: {
            estado: tipoAccion === 'ARCHIVO' ? 'ARCHIVADO' : 'CERRADO',
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
  // --- FIN DE LA MODIFICACIÓN ---

  // --- El método obtenerJerarquiaOficina se mantiene 100% igual ---
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

  // --- El método findAll se mantiene 100% igual ---
  async findAll() {
    return this.prisma.movimiento.findMany();
  }

  // --- El método findOne se mantiene 100% igual ---
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

  // --- El método update se mantiene 100% igual ---
  async update(id: string, updateMovimientoDto: UpdateMovimientoDto) {
    await this.findOne(id);
    return `This action updates a #${id} movimiento`;
  }

  // --- El método remove se mantiene 100% igual ---
  async remove(id: string) {
    throw new Error('La eliminación de movimientos no está permitida.');
  }
}
