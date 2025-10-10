import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTramiteDto } from './dto/create-tramite.dto';
import { UpdateTramiteDto } from './dto/update-tramite.dto';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class TramitesService {
  constructor(private readonly prisma: PrismaService) {}

  // --- MÉTODO 'create' CON LÓGICA DE NEGOCIO ---
  async create(createTramiteDto: CreateTramiteDto) {
    const { tipoDocumentoId, oficinaRemitenteId } = createTramiteDto;
    const anio = new Date().getFullYear();

    // 1. Obtener u crear el correlativo para este tipo de documento y oficina
    const correlativoData = await this.prisma.documentoCorrelativo.upsert({
      where: {
        anio_oficinaId_tipoDocumentoId: {
          anio,
          oficinaId: oficinaRemitenteId,
          tipoDocumentoId,
        },
      },
      update: {
        correlativo: {
          increment: 1,
        },
      },
      create: {
        anio,
        correlativo: 1,
        oficinaId: oficinaRemitenteId,
        tipoDocumentoId,
      },
    });

    const nuevoCorrelativo = correlativoData.correlativo;

    // 2. Obtener las siglas para construir el nombre del documento
    // (Esta lógica se puede hacer más compleja para manejar la jerarquía completa)
    const oficina = await this.prisma.oficina.findUnique({
      where: { id: oficinaRemitenteId },
    });
    const tipoDoc = await this.prisma.tipoDocumento.findUnique({
      where: { id: tipoDocumentoId },
    });

    // 3. Construir el número de documento completo
    const numeroDocumentoCompleto = `${tipoDoc.nombre}-${String(nuevoCorrelativo).padStart(3, '0')}-${anio}-${oficina.siglas}`;

    // 4. Crear el trámite en la base de datos
    return this.prisma.tramite.create({
      data: {
        ...createTramiteDto,
        anio,
        correlativo: nuevoCorrelativo,
        numeroDocumentoCompleto,
      },
    });
  }

  // --- MÉTODO 'findAll' CON PAGINACIÓN Y FILTROS (BÁSICO) ---
  async findAll() {
    // En un futuro, aquí se pueden añadir query params para filtrar y paginar
    return this.prisma.tramite.findMany({
      orderBy: {
        fechaIngreso: 'desc',
      },
    });
  }

  // --- MÉTODO 'findOne' CON RELACIONES ---
  // Devuelve un trámite con su historial completo
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

  // La eliminación de un trámite usualmente es cambiar su estado a ARCHIVADO o CERRADO
  // Esto se manejará a través del método 'update' o con la creación de un movimiento de cierre.
  // El método 'remove' tradicional no se implementa para evitar pérdida de datos.
  async remove(id: string) {
    // Lógica de borrado no recomendada para trámites.
    // Se puede implementar un borrado lógico si es estrictamente necesario.
    throw new Error(
      'La eliminación de trámites no está permitida. Se debe archivar o cerrar.',
    );
  }
}
