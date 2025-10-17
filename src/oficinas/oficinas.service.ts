import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateOficinaDto } from './dto/create-oficina.dto';
import { UpdateOficinaDto } from './dto/update-oficina.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { Oficina } from '@prisma/client';

@Injectable()
export class OficinasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createOficinaDto: CreateOficinaDto) {
    return this.prisma.oficina.create({
      data: createOficinaDto,
    });
  }

  // --- MÉTODO 'findAll' REFINADO PARA INCLUIR JERARQUÍA ---
  async findAll(wantTree = false) {
    const findOptions = {
      where: { isActive: true },
      // 1. Incluimos la relación con la oficina padre
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

    // 2. La lista plana ahora contiene la información del padre en cada oficina
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
