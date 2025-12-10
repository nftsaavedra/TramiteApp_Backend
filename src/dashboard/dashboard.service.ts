import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EstadoTramite, TipoAccion } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(userId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const [tramitesPendientes, finalizadosHoy, nuevosSemana, usuariosActivos] =
      await Promise.all([
        this.prisma.tramite.count({
          where: {
            estado: EstadoTramite.EN_PROCESO,
            ...(userId ? { usuarioAsignadoId: userId } : {}),
          },
        }),
        this.prisma.tramite.count({
          where: {
            estado: EstadoTramite.FINALIZADO,
            updatedAt: {
              gte: today,
              lt: tomorrow,
            },
          },
        }),
        this.prisma.tramite.count({
          where: {
            fechaRecepcion: {
              gte: startOfWeek,
            },
          },
        }),
        this.prisma.movimiento
          .groupBy({
            by: ['usuarioCreadorId'],
            where: {
              fechaMovimiento: {
                gte: today,
                lt: tomorrow,
              },
            },
          })
          .then((res) => (res.length > 0 ? res.length : 0)),
      ]);

    let activeUsersCount = usuariosActivos;
    if (activeUsersCount === 0) {
      activeUsersCount = await this.prisma.user.count({
        where: { isActive: true },
      });
    }

    return {
      tramitesPendientes,
      finalizadosHoy,
      nuevosSemana,
      usuariosActivos: activeUsersCount,
    };
  }

  async getVolumeStats(
    groupBy: 'day' | 'week' | 'month' | 'year' = 'month',
    limit: number = 6,
  ) {
    const today = new Date();
    let startDate = new Date();

    // Calcular fecha de inicio según agrupación (Limit - 1 para incluir el periodo actual como 1)
    const offset = limit > 0 ? limit - 1 : 0;

    switch (groupBy) {
      case 'day':
        startDate.setDate(today.getDate() - offset);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        // Retroceder N semanas y luego ir al inicio de esa semana (Domingo o Lunes)
        // Aproximación simple: Hoy - offset semanas
        startDate.setDate(today.getDate() - offset * 7);
        // Ajustar al lunes de esa semana (opcional, date_trunc('week') lo hace en DB, pero para filtro WHERE ayuda)
        // No es estrictamente necesario si usamos date_trunc en DB para agrupar, pero ayuda a limpiar datos parciales previos.
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate.setMonth(today.getMonth() - offset);
        startDate.setDate(1); // Inicio de ese mes
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'year':
        startDate.setFullYear(today.getFullYear() - offset);
        startDate.setMonth(0, 1);
        startDate.setHours(0, 0, 0, 0);
        break;
    }

    // Mapeo seguro para Prisma Raw Query (evitar inyección directa en string literal si fuera complejo, pero aquí usamos values controlados en switch)
    // Prisma $queryRaw parameterization is tricky with identifiers like date_trunc unit.
    // Usaremos casting ::text para asegurar tipos

    // NOTA: Prisma no permite parametrizar identificadores (como 'month', 'day').
    // Debemos validar estrictamente 'groupBy' antes de interpolar.
    const validUnits = ['day', 'week', 'month', 'year'];
    if (!validUnits.includes(groupBy)) throw new Error('Invalid groupBy unit');

    /* 
      Consulta Dinámica:
      Agrupa por la unidad de tiempo especificada.
      Usa COALESCE para tener fecha de recepción o creación.
      FIX TIMEZONE: Convertimos a Lima antes de truncar para que el corte de día sea local.
    */
    const result: any[] = await this.prisma.$queryRawUnsafe(
      `
      SELECT 
        DATE_TRUNC('${groupBy}', COALESCE("fechaRecepcion", "createdAt") AT TIME ZONE 'UTC' AT TIME ZONE 'America/Lima') as date_group,
        COUNT(*)::int as total
      FROM tramites
      WHERE COALESCE("fechaRecepcion", "createdAt") >= $1
      GROUP BY date_group
      ORDER BY date_group ASC
    `,
      startDate,
    );

    // Formateo de respuesta Front-End Friendly
    // Result.date_group viene como "2025-12-01 00:00:00" (Wall Time Lima).
    // Al hacer new Date() en servidor UTC, se trata como "2025-12-01 00:00:00 UTC".
    // Usamos timeZone: 'UTC' para formatear y mantener esa fecha exacta.
    return result.map((row) => {
      const date = new Date(row.date_group);
      let name = '';

      const fmtOpts: Intl.DateTimeFormatOptions = { timeZone: 'UTC' };

      switch (groupBy) {
        case 'day':
          name = date.toLocaleDateString('es-ES', {
            ...fmtOpts,
            weekday: 'short',
            day: 'numeric',
          });
          break;
        case 'week':
          name = `Sem ${getWeekNumber(date)}`;
          name = date.toLocaleDateString('es-ES', {
            ...fmtOpts,
            month: 'short',
            day: 'numeric',
          });
          break;
        case 'month':
          name = date.toLocaleDateString('es-ES', {
            ...fmtOpts,
            month: 'short',
            year: '2-digit',
          });
          break;
        case 'year':
          // getFullYear usa local del servidor. Si servidor es UTC y date es 00:00 UTC, es correcto.
          // Para seguridad usamos getUTCFullYear
          name = date.getUTCFullYear().toString();
          break;
      }

      return {
        name: capitalize(name), // Helper para mayúscula inicial
        date: date.toISOString(), // ISO (UTC). El frontend debe saber que esto es el inicio del periodo.
        total: row.total,
      };
    });
  }

  async getRecentActivity() {
    const movimientos = await this.prisma.movimiento.findMany({
      take: 5,
      orderBy: { fechaMovimiento: 'desc' },
      include: {
        usuarioCreador: { select: { name: true } },
        oficinaDestino: { select: { nombre: true, siglas: true } },
        tramite: {
          select: {
            numeroDocumento: true,
            tipoDocumento: { select: { nombre: true } },
          },
        },
      },
    });

    return movimientos.map((mov) => {
      // Safe casting to access included relations
      const m = mov as any;
      const userName = m.usuarioCreador?.name || 'Desconocido';

      const nameParts = userName.split(' ');
      const shortName =
        nameParts.length > 1
          ? `${nameParts[0].charAt(0)}. ${nameParts[1]}`
          : userName;

      let actionText = '';
      let color = 'bg-gray-500';

      switch (m.tipoAccion) {
        case TipoAccion.ENVIO:
          actionText = 'derivó';
          color = 'bg-blue-500';
          break;
        case TipoAccion.RECEPCION:
          actionText = 'recibió';
          color = 'bg-yellow-500';
          break;
        default:
          actionText = 'procesó';
          color = 'bg-gray-500';
      }

      const docName =
        m.nombreDocumentoCompleto || m.tramite?.numeroDocumento || 'S/N';
      const destino =
        m.oficinaDestino?.siglas || m.oficinaDestino?.nombre || 'General';

      return {
        user: shortName,
        action: actionText,
        document: docName,
        to: destino,
        color,
        date: m.fechaMovimiento,
      };
    });
  }
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getWeekNumber(d: Date) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return weekNo;
}
