import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { OficinasModule } from './oficinas/oficinas.module';
import { TiposDocumentoModule } from './tipos-documento/tipos-documento.module';
import { TramitesModule } from './tramites/tramites.module';
import { MovimientosModule } from './movimientos/movimientos.module';
import { AnotacionesModule } from './anotaciones/anotaciones.module';
import { FeriadosModule } from './feriados/feriados.module';
import { PlazoModule } from './common/plazo/plazo.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { LoggerModule } from 'nestjs-pino';
import { StatusModule } from './status/status.module';
import { SystemConfigModule } from './system-config/system-config.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Optimización: Logging estructurado con Pino
    LoggerModule.forRoot(),
    // Optimización: Cache global (Memoria por defecto, Redis opcional)
    // NOTA: Redis solo es necesario cuando hay múltiples instancias del servidor
    // Para desarrollo y producción con una sola instancia, el caché en memoria es suficiente
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        const isRedisAvailable = process.env.REDIS_URL;
        
        if (isRedisAvailable) {
          return {
            store: await redisStore({
              url: process.env.REDIS_URL || 'redis://localhost:6379',
              ttl: 300, // 5 minutos default
            }),
          };
        }
        
        // Fallback a cache en memoria
        return {
          ttl: 300,
          max: 1000,
        };
      },
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    OficinasModule,
    TiposDocumentoModule,
    TramitesModule,
    MovimientosModule,
    AnotacionesModule,
    FeriadosModule,
    PlazoModule,
    DashboardModule,
    StatusModule,
    SystemConfigModule,
  ],
})
export class AppModule {}
