import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class PlazoService implements OnModuleInit {
  private readonly logger = new Logger(PlazoService.name);
  private feriados: Set<string> = new Set();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Carga los feriados en memoria al iniciar el módulo para optimizar las consultas.
   */
  async onModuleInit() {
    await this.cargarFeriados();
  }

  /**
   * Obtiene los feriados de la base de datos y los almacena en un Set para búsquedas rápidas.
   */
  async cargarFeriados() {
    const feriadosDb = await this.prisma.feriado.findMany({
      select: { fecha: true },
    });

    this.feriados = new Set(
      feriadosDb.map((f) => f.fecha.toISOString().split('T')[0]),
    );
    this.logger.log(`Feriados cargados en memoria: ${this.feriados.size}`);
  }

  /**
   * Calcula los días hábiles transcurridos entre dos fechas.
   * Excluye sábados, domingos y los feriados cargados en memoria.
   * @param fechaInicio La fecha desde la que se empieza a contar.
   * @param fechaFin La fecha hasta la que se cuenta (normalmente la fecha actual).
   * @returns El número de días hábiles transcurridos.
   */
  calcularDiasHabiles(fechaInicio: Date, fechaFin: Date): number {
    let diasHabiles = 0;
    const fechaActual = new Date(fechaInicio);

    while (fechaActual <= fechaFin) {
      const diaSemana = fechaActual.getDay();
      const fechaStr = fechaActual.toISOString().split('T')[0];

      const esFinDeSemana = diaSemana === 0 || diaSemana === 6;

      if (!esFinDeSemana && !this.feriados.has(fechaStr)) {
        diasHabiles++;
      }

      fechaActual.setDate(fechaActual.getDate() + 1);
    }

    return Math.max(0, diasHabiles - 1);
  }
}
