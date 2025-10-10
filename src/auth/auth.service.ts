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
}