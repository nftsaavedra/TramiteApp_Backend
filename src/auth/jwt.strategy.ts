import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';

// --- AÑADIDO: Definimos una interfaz para el payload del token ---
// Esto mejora la seguridad de tipos y el autocompletado.
interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: Role;
  oficinaId: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  // --- MÉTODO 'validate' CORREGIDO ---
  // Ahora el payload tiene un tipo definido y devolvemos todos los datos necesarios.
  async validate(payload: JwtPayload) {
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      oficinaId: payload.oficinaId,
    };
  }
}
