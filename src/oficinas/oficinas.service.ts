import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateOficinaDto } from './dto/create-oficina.dto';
import { UpdateOficinaDto } from './dto/update-oficina.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { Oficina, Prisma } from '@prisma/client';
import { FindAllOficinasDto } from './dto/find-all-oficinas';

@Injectable()
export class OficinasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createOficinaDto: CreateOficinaDto) {
    return this.prisma.oficina.create({
      data: createOficinaDto,
    });
  }

  // --- MÉTODO 'findAll' REFACTORIZADO PARA FILTROS DINÁMICOS ---
  async findAll(query: FindAllOficinasDto) {
    const { nombre, siglas, tipo, tree } = query;
    const wantTree = tree === 'true';

    // Construimos la cláusula 'where' dinámicamente
    const where: Prisma.OficinaWhereInput = {
      isActive: true,
    };

    if (nombre) {
      where.nombre = { contains: nombre, mode: 'insensitive' };
    }
    if (siglas) {
      where.siglas = { contains: siglas, mode: 'insensitive' };
    }
    if (tipo) {
      where.tipo = tipo;
    }

    const findOptions = {
      where,
      include: {
        parent: {
          select: {
            id: true,
            nombre: true,
            siglas: true,
          },
        },
      },
      orderBy: {
        nombre: 'asc' as const,
      },
    };

    const todasLasOficinas = await this.prisma.oficina.findMany(findOptions);

    if (wantTree) {
      const construirArbol = (
        list: (Oficina & { parent: { siglas: string } | null })[],
        parentId: string | null = null,
      ): any[] => {
        return list
          .filter((oficina) => oficina.parentId === parentId)
          .map((oficina) => ({
            ...oficina,
            children: construirArbol(list, oficina.id),
          }));
      };
      return construirArbol(todasLasOficinas);
    }

    // La lista plana ahora está filtrada y contiene la info del padre
    return todasLasOficinas;
  }

  // --- MÉTODO 'findOne' MEJORADO ---
  async findOne(id: string) {
    const oficina = await this.prisma.oficina.findUnique({
      where: { id },
      include: {
        children: {
          // Incluimos las oficinas hijas activas
          where: { isActive: true },
        },
      },
    });

    if (!oficina) {
      throw new NotFoundException(`Oficina con ID "${id}" no encontrada`);
    }
    return oficina;
  }

  async update(id: string, updateOficinaDto: UpdateOficinaDto) {
    // Primero, verificamos que la oficina exista
    await this.findOne(id);

    return this.prisma.oficina.update({
      where: { id },
      data: updateOficinaDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.oficina.update({
      where: { id },
      data: {
        isActive: false, // Eliminación lógica
      },
    });
  }
}
