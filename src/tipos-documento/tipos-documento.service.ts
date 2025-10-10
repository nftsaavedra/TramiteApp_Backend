import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTiposDocumentoDto } from './dto/create-tipos-documento.dto';
import { UpdateTiposDocumentoDto } from './dto/update-tipos-documento.dto';
import { PrismaService } from '@/prisma/prisma.service'; // Asegúrate de que la ruta sea correcta

@Injectable()
export class TiposDocumentoService {
  // 1. Inyectamos PrismaService para el acceso a la BD
  constructor(private readonly prisma: PrismaService) {}

  // 2. Método para crear un nuevo tipo de documento
  async create(createTiposDocumentoDto: CreateTiposDocumentoDto) {
    return this.prisma.tipoDocumento.create({
      data: createTiposDocumentoDto,
    });
  }

  // 3. Método para obtener todos los tipos de documento activos
  async findAll() {
    return this.prisma.tipoDocumento.findMany({
      where: { isActive: true },
    });
  }

  // 4. Método para buscar un tipo de documento por su ID
  async findOne(id: string) {
    const tipoDocumento = await this.prisma.tipoDocumento.findUnique({
      where: { id },
    });

    if (!tipoDocumento) {
      throw new NotFoundException(`Tipo de Documento con ID "${id}" no encontrado`);
    }
    return tipoDocumento;
  }

  // 5. Método para actualizar un tipo de documento
  async update(id: string, updateTiposDocumentoDto: UpdateTiposDocumentoDto) {
    await this.findOne(id); // Verifica que exista
    return this.prisma.tipoDocumento.update({
      where: { id },
      data: updateTiposDocumentoDto,
    });
  }

  // 6. Método para eliminación lógica (desactivar)
  async remove(id: string) {
    await this.findOne(id); // Verifica que exista
    return this.prisma.tipoDocumento.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
  }
}