import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTramiteDto } from './dto/create-tramite.dto';
import { UpdateTramiteDto } from './dto/update-tramite.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { Oficina } from '@prisma/client';

@Injectable()
export class TramitesService {
  constructor(private readonly prisma: PrismaService) {}

  // --- MÉTODO 'create' REESTRUCTURADO ---
  async create(createTramiteDto: CreateTramiteDto) {
    const {
      tipoDocumentoId,
      oficinaRemitenteId,
      numeroDocumento,
      ...tramiteData
    } = createTramiteDto;
    const anio = new Date().getFullYear();

    // 1. Obtener los datos necesarios para construir el nombre
    const tipoDoc = await this.prisma.tipoDocumento.findUniqueOrThrow({
      where: { id: tipoDocumentoId },
    });

    // 2. Construir la jerarquía de siglas de la oficina
    const jerarquia = await this.obtenerJerarquiaOficina(oficinaRemitenteId);

    // 3. Ensamblar el número de documento completo
    // Formato: INFORME-N°-XXX-2025-VPIN/DGI/UED
    const numeroDocumentoCompleto = `${tipoDoc.nombre}-N°-${numeroDocumento}-${anio}-${jerarquia}`;

    // 4. Crear el trámite en la base de datos
    return this.prisma.tramite.create({
      data: {
        ...tramiteData,
        numeroDocumento,
        numeroDocumentoCompleto,
        tipoDocumentoId,
        oficinaRemitenteId,
      },
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

  // --- MÉTODO 'findAll' (sin cambios) ---
  async findAll() {
    return this.prisma.tramite.findMany({
      orderBy: {
        fechaIngreso: 'desc',
      },
    });
  }

  // --- MÉTODO 'findOne' (sin cambios) ---
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
            destinos: {
              include: {
                oficinaDestino: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        anotaciones: {
          include: {
            autor: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!tramite) {
      throw new NotFoundException(`Trámite con ID "${id}" no encontrado`);
    }
    return tramite;
  }

  async update(id: string, updateTramiteDto: UpdateTramiteDto) {
    await this.findOne(id);
    return this.prisma.tramite.update({
      where: { id },
      data: updateTramiteDto,
    });
  }

  async remove(id: string) {
    throw new Error(
      'La eliminación de trámites no está permitida. Se debe archivar o cerrar.',
    );
  }
}
