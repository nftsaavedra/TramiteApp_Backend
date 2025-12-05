import {
  Controller,
  Post,
  Get,
  UseGuards,
  Request,
  Patch,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { UsersService } from '@/users/users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
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

  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  async changePassword(
    @Request() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    try {
      return await this.authService.changePassword(
        req.user.id,
        changePasswordDto,
      );
    } catch (error) {
      // Manejamos el error específico de contraseña incorrecta para devolver un 400/401 adecuado
      if (error.message === 'La contraseña actual es incorrecta') {
        throw new BadRequestException('La contraseña actual es incorrecta');
      }
      throw error;
    }
  }
}
