import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' }); // Le decimos a passport que nuestro "username" es el campo "email"
  }

  async validate(email: string, password: string): Promise<any> {
    try {
      const user = await this.authService.validateUser(email, password);
      if (!user) {
        throw new UnauthorizedException({
          code: 'INVALID_CREDENTIALS',
          message: 'Correo o contraseña incorrectos',
        });
      }
      return user;
    } catch (error) {
      // Si ya es una excepción controlada, la relanzamos
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      // Para otros errores, lanzamos una excepción genérica
      throw new UnauthorizedException({
        code: 'AUTH_VALIDATION_ERROR',
        message: 'Error al validar credenciales',
      });
    }
  }
}
