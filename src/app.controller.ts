import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AppService } from './app.service';
import { JwtAuthGuard } from './common/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles/roles.guard';
import { Roles } from './common/decorators/roles/roles.decorator';
import { Role } from '@prisma/client';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RECEPCIONISTA) // <-- CORREGIDO: Rol actualizado de OPERADOR a RECEPCIONISTA
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }
}
