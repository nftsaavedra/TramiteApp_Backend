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

  // --- MÉTODO 'findAll' ACTUALIZADO Y FLEXIBLE ---
  async findAll(wantTree = false) {
    const todasLasOficinas = await this.prisma.oficina.findMany({
      where: { isActive: true },
    });

    if (wantTree) {
      // Si se solicita el árbol, lo construimos
      const construirArbol = (
        list: Oficina[],
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

    // Por defecto, devolvemos la lista plana
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
