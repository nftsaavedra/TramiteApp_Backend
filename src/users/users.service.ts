import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role, User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

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

  async ensureSuperUserExists(): Promise<User> {
    // Define las credenciales del superusuario. En un entorno real, esto vendría de variables de entorno.
    const superUserEmail = 'supervisor@multibank.com';
    const superUserPassword = 'PasswordSeguro123';

    // 1. Busca si el usuario ya existe.
    const existingUser = await this.findByEmail(superUserEmail);

    // 2. Si ya existe, lo devuelve y no hace nada más.
    if (existingUser) {
      return existingUser;
    }

    // 3. Si no existe, lo crea usando el método create() que ya teníamos.
    console.log('Creando superusuario...');
    const newUser = await this.create({
      email: superUserEmail,
      name: 'Supervisor Principal',
      password: superUserPassword,
      role: Role.SUPERVISOR,
    });
    console.log('Superusuario creado exitosamente.');
    return newUser;
  }
}
