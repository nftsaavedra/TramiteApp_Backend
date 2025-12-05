import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role, Prisma } from '@prisma/client';
import type { User } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FindAllUsersDto } from './dto/find-all-users.dto';
import { PrismaWhereBuilder } from '@/common/utils/prisma-where.builder';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  // --- MÉTODO 'create' (Mantenido igual) ---
  async create(createUserDto: CreateUserDto): Promise<Omit<User, 'password'>> {
    const existingUser = await this.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('El correo electrónico ya está en uso.');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
    });

    const { password, ...result } = user;
    return result;
  }

  // --- MÉTODO 'findAll' CORREGIDO (name vs nombre) ---
  async findAll(query: FindAllUsersDto) {
    const { q, role, activo, page = '1', limit = '10', sortBy } = query;

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    // 1. Construcción de Filtros
    const whereBuilder = new PrismaWhereBuilder()
      // CORRECCIÓN: Usamos 'name' según tu schema.prisma, eliminamos 'apellidos'
      .addSmartSearch(q, ['name', 'email'])
      .addInFilter('role', role);

    const where = whereBuilder.build();

    // Lógica de Estado
    if (activo !== undefined) {
      where.isActive = activo === 'true';
    }

    // 2. Ordenamiento
    let orderBy: Prisma.UserOrderByWithRelationInput = { createdAt: 'desc' };
    if (sortBy) {
      const [field, direction] = sortBy.split(':');
      // CORRECCIÓN: Validamos 'name' en lugar de 'nombre'
      const validFields = ['name', 'email', 'role', 'createdAt'];
      if (validFields.includes(field)) {
        orderBy = { [field]: direction as Prisma.SortOrder };
      }
    }

    // 3. Ejecución
    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip: (pageNumber - 1) * limitNumber,
        take: limitNumber,
        orderBy,
        select: {
          id: true,
          name: true, // CORRECTO: Coincide con el schema
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          oficinaId: true,
          oficina: {
            select: {
              id: true,
              nombre: true, // En Oficina sí es 'nombre' según línea 93 del schema
              siglas: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page: pageNumber,
        limit: limitNumber,
        lastPage: Math.ceil(total / limitNumber),
      },
    };
  }

  // ... (Resto de métodos findOne, update, remove, ensureSuperUserExists se mantienen igual) ...

  async findOne(id: string): Promise<Omit<User, 'password'>> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        oficina: {
          select: {
            id: true,
            nombre: true,
            siglas: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID "${id}" no encontrado.`);
    }

    const { password, ...result } = user;
    return result;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  // Método interno para cambio de contraseña
  async findByIdWithPassword(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<Omit<User, 'password'>> {
    await this.findOne(id);
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
    const { password, ...result } = updatedUser;
    return result;
  }

  async remove(id: string): Promise<Omit<User, 'password'>> {
    await this.findOne(id);
    const deactivatedUser = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
    const { password, ...result } = deactivatedUser;
    return result;
  }

  async ensureSuperUserExists(): Promise<User | undefined> {
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD');

    if (!adminEmail || !adminPassword) {
      console.warn('Credenciales Admin no definidas.');
      return;
    }

    const existingUser = await this.findByEmail(adminEmail);
    if (existingUser) {
      return existingUser;
    }

    console.log('Creando usuario ADMIN...');
    const adminDto: CreateUserDto = {
      email: adminEmail,
      name: 'Administrador Principal', // Correcto
      password: adminPassword,
      role: Role.ADMIN,
      oficinaId: null,
    };

    const newUser = await this.prisma.user.create({
      data: {
        ...adminDto,
        password: await bcrypt.hash(adminDto.password, 10),
      },
    });
    return newUser;
  }
}
