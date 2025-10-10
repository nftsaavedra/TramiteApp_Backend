import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '@/common/decorators/roles/roles.decorator'; // <-- CORREGIDO: Se añadió el alias @/

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();

    // --- LÓGICA ACTUALIZADA ---
    // Un ADMIN tiene acceso a todo.
    if (user.role === Role.ADMIN) {
      // <-- CORREGIDO: Rol actualizado a ADMIN
      return true;
    }

    // Comprueba si el rol del usuario es uno de los roles requeridos.
    return requiredRoles.some((role) => user.role === role); // <-- LÓGICA MEJORADA
  }
}
