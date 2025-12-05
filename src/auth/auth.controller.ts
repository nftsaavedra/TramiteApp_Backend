import {
  Controller,
  Post,
  Get,
  UseGuards,
  Request,
  Patch,
  Body,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { UsersService } from '@/users/users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
// Asegúrate de que la ruta de importación sea correcta según tu estructura
import { JwtAuthGuard } from '@/common/guards/jwt-auth/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  // --- NUEVO ENDPOINT DE REHIDRATACIÓN ---
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  updateProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    return this.usersService.update(req.user.id, updateProfileDto);
  }
}
