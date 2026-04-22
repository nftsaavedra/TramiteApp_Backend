import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async health() {
    const healthcheck = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'disconnected',
    };

    try {
      // Verificar conexión a base de datos
      await this.prisma.$queryRaw`SELECT 1`;
      healthcheck.database = 'connected';
    } catch (error) {
      healthcheck.status = 'error';
      healthcheck.database = 'disconnected';
    }

    return healthcheck;
  }

  @Get('ready')
  async readiness() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready', timestamp: new Date().toISOString() };
    } catch (error) {
      return { 
        status: 'not_ready', 
        timestamp: new Date().toISOString(),
        error: 'Database connection failed' 
      };
    }
  }
}
