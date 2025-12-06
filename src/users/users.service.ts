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

  async create(createUserDto: CreateUserDto): Promise<Omit<User, 'password'>> {
    try {
      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

      const user = await this.prisma.user.create({
        data: {
          ...createUserDto,
          password: hashedPassword,
        },
      });

      const { password, ...result } = user;
      return result;
    } catch (error) {
      this.handlePrismaError(error, 'Error al crear usuario');
      throw error;
    }
  }

  async findAll(query: FindAllUsersDto) {
    const { q, role, activo, page = '1', limit = '10', sortBy } = query;

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    const whereBuilder = new PrismaWhereBuilder()
      .addSmartSearch(q, ['name', 'email'])
      .addInFilter('role', role);

    const where = whereBuilder.build();

    if (activo !== undefined) {
      where.isActive = activo === 'true';
    }

    let orderBy: Prisma.UserOrderByWithRelationInput = { createdAt: 'desc' };
    if (sortBy) {
      const [field, direction] = sortBy.split(':');
      const validFields = ['name', 'email', 'role', 'createdAt'];
      if (validFields.includes(field)) {
        orderBy = { [field]: direction as Prisma.SortOrder };
      }
    }

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip: (pageNumber - 1) * limitNumber,
        take: limitNumber,
        orderBy,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          oficinaId: true,
          oficina: {
            select: {
              id: true,
              nombre: true,
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

  async findByIdWithPassword(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<Omit<User, 'password'>> {
    // Verificar existencia previa
    await this.findOne(id);

    // Si se envía password, hashear
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    try {
      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: updateUserDto,
      });
      const { password, ...result } = updatedUser;
      return result;
    } catch (error) {
      this.handlePrismaError(error, 'Error al actualizar usuario');
      throw error;
    }
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
      name: 'Super Usuario',
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

  // Helper para errores de Prisma
  private handlePrismaError(error: any, messageCtx: string) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException(`${messageCtx}: El email ya está en uso.`);
      }
      if (error.code === 'P2003') {
        throw new NotFoundException(
          `${messageCtx}: La oficina referenciada no existe.`,
        );
      }
      if (error.code === 'P2025') {
        throw new NotFoundException(`${messageCtx}: Registro no encontrado.`);
      }
    }
    // Si no es un error conocido, lo relanzamos o dejamos que Nest lo maneje como 500
  }
}
