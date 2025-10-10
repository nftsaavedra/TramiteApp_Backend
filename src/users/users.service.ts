import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  // --- MÉTODO 'create' MEJORADO ---
  async create(createUserDto: CreateUserDto): Promise<Omit<User, 'password'>> {
    // 1. Verificar si el email ya existe
    const existingUser = await this.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('El correo electrónico ya está en uso.');
    }

    // 2. Hashear la contraseña
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // 3. Crear el usuario
    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
    });

    // 4. Devolver el usuario sin la contraseña
    const { password, ...result } = user;
    return result;
  }

  // --- AÑADIDO: Método para listar todos los usuarios ---
  async findAll(): Promise<Omit<User, 'password'>[]> {
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
    });
    // Excluimos la contraseña de cada usuario en la respuesta
    return users.map(({ password, ...user }) => user);
  }

  // --- AÑADIDO: Método para buscar un usuario por ID ---
  async findOne(id: string): Promise<Omit<User, 'password'>> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID "${id}" no encontrado.`);
    }

    const { password, ...result } = user;
    return result;
  }

  // --- MÉTODO INTERNO: Se mantiene como está ---
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  // --- AÑADIDO: Método para actualizar un usuario ---
  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<Omit<User, 'password'>> {
    await this.findOne(id); // Verificar que el usuario exista

    // Si se está actualizando la contraseña, hashearla
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

  // --- AÑADIDO: Método para eliminación lógica ---
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
      console.warn(
        'Credenciales de administrador no definidas en .env, omitiendo creación.',
      );
      return;
    }

    const existingUser = await this.findByEmail(adminEmail);

    if (existingUser) {
      return existingUser;
    }

    console.log('Creando usuario ADMIN...');
    // Usamos el método 'create' directamente, pero necesitamos pasar un DTO válido
    const adminDto: CreateUserDto = {
      email: adminEmail,
      name: 'Administrador Principal',
      password: adminPassword,
      role: Role.ADMIN,
      oficinaId: null,
    };
    // El método create ya hashea la contraseña y maneja la creación
    const newUser = await this.prisma.user.create({
      data: {
        ...adminDto,
        password: await bcrypt.hash(adminDto.password, 10),
      },
    });
    console.log('Usuario ADMIN creado exitosamente.');
    return newUser;
  }
}
