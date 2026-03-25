import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { SystemConfigService } from './system-config.service';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { RolesGuard } from '@/common/guards/roles/roles.guard';
import { JwtAuthGuard } from '@/common/guards/jwt-auth/jwt-auth.guard';
import { Roles } from '@/common/decorators/roles/roles.decorator';
import { Role } from '@prisma/client';

export class InitializeSystemConfigDto {
  @IsString()
  @MinLength(5)
  rootOfficeName: string;

  @IsString()
  @MinLength(2)
  rootOfficeSiglas: string;

  @IsOptional()
  @IsString()
  defaultRole?: string;
}

export class UpdateSystemConfigDto {
  @IsOptional()
  @IsString()
  @MinLength(5)
  rootOfficeName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  rootOfficeSiglas?: string;
}

@Controller('system-config')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SystemConfigController {
  constructor(
    private readonly systemConfigService: SystemConfigService,
  ) {}

  @Get()
  @Roles(Role.SUPERUSER, Role.ADMIN)
  async getConfig() {
    const config = await this.systemConfigService.getConfig();
    return {
      data: config,
      message: 'Configuración del sistema obtenida exitosamente',
    };
  }

  @Post('initialize')
  async initializeSystem(@Body() initDto?: InitializeSystemConfigDto) {
    const isInitialized = await this.systemConfigService.isInitialized();
    
    if (isInitialized) {
      throw new BadRequestException(
        'El sistema ya está inicializado. Use el endpoint /update para modificar la configuración.',
      );
    }

    // Si no hay datos, usar valores por defecto mínimos
    const configData = {
      rootOfficeName: initDto?.rootOfficeName || 'Oficina Principal',
      rootOfficeSiglas: initDto?.rootOfficeSiglas || 'OP',
      defaultRole: initDto?.defaultRole || 'RECEPCIONISTA',
    };

    await this.systemConfigService.initializeSystem(configData);
    
    return {
      message: 'Sistema inicializado correctamente',
      data: {
        rootOfficeName: configData.rootOfficeName,
        rootOfficeSiglas: configData.rootOfficeSiglas,
      },
    };
  }

  @Post('update')
  @Roles(Role.SUPERUSER)
  async updateConfig(@Body() updateDto: UpdateSystemConfigDto) {
    const updatedConfig = await this.systemConfigService.updateConfig({
      rootOfficeName: updateDto.rootOfficeName,
      rootOfficeSiglas: updateDto.rootOfficeSiglas,
    });

    return {
      data: updatedConfig,
      message: 'Configuración del sistema actualizada exitosamente',
    };
  }
}
