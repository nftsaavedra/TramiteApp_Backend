import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { UsersService } from '@/users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ChangePasswordDto } from './dto/change-password.dto';
import { User, Role } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(
    email: string,
    pass: string,
  ): Promise<Omit<User, 'password'> | null> {
    try {
      const user = await this.usersService.findByEmail(email);
      if (user && (await bcrypt.compare(pass, user.password))) {
        const { password, ...result } = user;
        return result;
      }
      return null;
    } catch (error) {
      // Manejo específico de errores de base de datos
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new InternalServerErrorException({
            code: 'DB_CONSTRAINT_ERROR',
            message: 'Error en la relación de datos',
          });
        }
        if (error.code === 'P2015') {
          throw new UnauthorizedException({
            code: 'INVALID_CREDENTIALS',
            message: 'Credenciales incorrectas',
          });
        }
      }
      
      // Error genérico de servidor
      throw new InternalServerErrorException({
        code: 'SERVER_ERROR',
        message: 'Error interno del servidor',
      });
    }
  }

  async login(user: Omit<User, 'password'> & { oficinaId?: string | null }) {
    try {
      const payload = {
        name: user.name,
        email: user.email,
        sub: user.id,
        role: user.role,
        oficinaId: user.oficinaId,
      };
      
      return {
        access_token: this.jwtService.sign(payload),
        message: 'Autenticación exitosa',
      };
    } catch (error) {
      throw new InternalServerErrorException({
        code: 'TOKEN_GENERATION_ERROR',
        message: 'Error al generar token de autenticación',
      });
    }
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.usersService.findByIdWithPassword(userId);

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }

    return this.usersService.update(userId, {
      password: changePasswordDto.newPassword,
    });
  }
}
