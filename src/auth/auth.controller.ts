import { Controller, Post, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(AuthGuard('local')) // 1. Usamos el guardián de la estrategia local
  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.user); // 2. Si la estrategia es exitosa, el user se adjunta a req
  }
}
