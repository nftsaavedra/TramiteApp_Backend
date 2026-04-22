import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { validationSchema } from './config/env.validation';
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
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ThrottlerModule } from '@nestjs/throttler';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // Sirve frontend React desde /public/ con fallback automático a index.html para SPA routing
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),  // ← process.cwd() para ruta absoluta
      serveRoot: '/',
      exclude: ['/api/*path'],  // Excluir rutas de API (path-to-regexp v8 requiere nombre)
      serveStaticOptions: {
        index: 'index.html',  // Fallback automático para SPA
        maxAge: 3600000,
        cacheControl: true,
        setHeaders: (res, path) => {
          if (path.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache')
          }
        },
      },
    }),
    
    // Fallback para SPA routing - captura TODAS las rutas no-API y sirve index.html
    // Esto es CRÍTICO para TanStack Router - sin esto, al recargar /login da 404
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
      serveRoot: '/*path',  // Wildcard para todas las rutas (sintaxis v8 requiere nombre)
      exclude: ['/api/*path'],
      serveStaticOptions: {
        index: 'index.html',
      },
    }),
    
    // Optimización: Rate Limiting global (protección contra abuso y fuerza bruta)
    ThrottlerModule.forRoot([{
      ttl: 60000,  // 1 minuto
      limit: 20,   // 20 requests por minuto por IP
    }]),
    
    // Validación de variables de entorno con Joi
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false, // Mostrar todos los errores de una vez
      },
    }),
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
    HealthModule,
  ],
})
export class AppModule {}
