import { Injectable } from '@nestjs/common';
import { UsersService } from '@/users/users.service'; // <-- CORREGIDO: Se añadió el alias @/
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  // 1. Valida si el usuario y la contraseña son correctos
  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  // 2. Genera el token JWT después de una validación exitosa
  async login(user: any) {
    const payload = {
      name: user.name,
      email: user.email,
      sub: user.id,
      role: user.role,
      oficinaId: user.oficinaId, // <-- MEJORA: Añadimos la oficina al token
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async changePassword(userId: string, changePasswordDto: any) {
    const user = await this.usersService.findByIdWithPassword(userId);

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // 1. Verificar contraseña actual
    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new Error('La contraseña actual es incorrecta');
    }

    // 2. Hashear nueva contraseña y actualizar
    // UsersService.update hashea si se le pasa password
    return this.usersService.update(userId, {
      password: changePasswordDto.newPassword,
    });
  }
}
