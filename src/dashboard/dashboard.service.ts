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

  async getMonthlyVolume() {
    const currentYear = new Date().getFullYear();
    const startDate = new Date(currentYear, 0, 1);
    const endDate = new Date(currentYear + 1, 0, 1);

    const result: any[] = await this.prisma.$queryRaw`
      SELECT 
        TO_CHAR(COALESCE("fechaRecepcion", "createdAt"), 'Mon') as name,
        EXTRACT(MONTH FROM COALESCE("fechaRecepcion", "createdAt")) as month_num,
        COUNT(*)::int as total
      FROM tramites
      WHERE COALESCE("fechaRecepcion", "createdAt") >= ${startDate} AND COALESCE("fechaRecepcion", "createdAt") < ${endDate}
      GROUP BY TO_CHAR(COALESCE("fechaRecepcion", "createdAt"), 'Mon'), EXTRACT(MONTH FROM COALESCE("fechaRecepcion", "createdAt"))
      ORDER BY month_num ASC
    `;

    const monthMap: Record<string, string> = {
      Jan: 'Ene',
      Feb: 'Feb',
      Mar: 'Mar',
      Apr: 'Abr',
      May: 'May',
      Jun: 'Jun',
      Jul: 'Jul',
      Aug: 'Ago',
      Sep: 'Sep',
      Oct: 'Oct',
      Nov: 'Nov',
      Dec: 'Dic',
    };

    const finalData: { name: string; total: number }[] = [];
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    for (const m of months) {
      const found = result.find((r) => r.name.trim() === m);
      finalData.push({
        name: monthMap[m],
        total: found ? found.total : 0,
      });
    }

    return finalData;
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
      };
    });
  }
}
