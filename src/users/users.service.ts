import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async create(
    data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  // --- CORREGIDO: Se ajustó el tipo de retorno de la promesa ---
  async ensureSuperUserExists(): Promise<User | undefined> {
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD');

    if (!adminEmail || !adminPassword) {
      console.warn(
        'Credenciales de administrador no definidas en .env, omitiendo creación.',
      );
      return; // Ahora esto es válido
    }

    const existingUser = await this.findByEmail(adminEmail);

    if (existingUser) {
      return existingUser;
    }

    console.log('Creando usuario ADMIN...');
    const newUser = await this.create({
      email: adminEmail,
      name: 'Administrador Principal',
      password: adminPassword,
      role: Role.ADMIN,
      isActive: true,
      oficinaId: null,
    });
    console.log('Usuario ADMIN creado exitosamente.');
    return newUser;
  }
}
