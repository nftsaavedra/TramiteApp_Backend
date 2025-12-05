import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
// import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard'; // Asumo que existe autenticación, la habilitaré si es el patrón.

@Controller('dashboard')
// @UseGuards(JwtAuthGuard) // Descomentar cuando se verifique el guard de autenticación
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  getStats() {
    return this.dashboardService.getStats();
  }

  @Get('monthly-volume')
  getMonthlyVolume() {
    return this.dashboardService.getMonthlyVolume();
  }

  @Get('recent-activity')
  getRecentActivity() {
    return this.dashboardService.getRecentActivity();
  }
}
