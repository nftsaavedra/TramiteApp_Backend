import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { ValidationPipe, Logger } from '@nestjs/common';
import compression from 'compression';
import helmet from 'helmet';
import { Logger as PinoLogger } from 'nestjs-pino';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  // Logging estructurado con Pino
  app.useLogger(app.get(PinoLogger));

  // CORS inteligente: estricto en desarrollo, permisivo en producción
  const isProduction = process.env.NODE_ENV === 'production'
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:5174,http://localhost:3000'
  const allowedOrigins = corsOrigin.split(',').map(origin => origin.trim())
  
  if (isProduction) {
    // En producción, mismo origen = sin restricciones CORS
    app.enableCors({
      origin: true,  // Acepta cualquier origen (mismo dominio)
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
      credentials: true,
      maxAge: 86400, // 24 horas
    })
  } else {
    // En desarrollo, mantener lista restrictiva
    app.enableCors({
      origin: function (origin, callback) {
        // Permitir solicitudes sin origen (como mobile apps o postman)
        if (!origin) return callback(null, true)
        
        // Verificar si el origen está en la lista permitida
        if (allowedOrigins.indexOf(origin) !== -1 || 
            origin === 'http://localhost:5173' || 
            origin === 'http://localhost:5174' || 
            origin === 'http://localhost:3000' || 
            origin === 'http://127.0.0.1:5173' || 
            origin === 'http://127.0.0.1:5174') {
          callback(null, true)
        } else {
          callback(new Error('No allowed by CORS'))
        }
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
      credentials: true,
      maxAge: 86400, // 24 horas
    })
  }

  // Optimización 5: Validación rápida
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      // Optimización: Detener en primer error para respuestas más rápidas
      stopAtFirstError: true,
    }),
  );

  // Optimización 6: Global prefix para routing más eficiente
  // NOTA: Las rutas estáticas (/assets, /chunks, /images) se excluyen automáticamente
  app.setGlobalPrefix('api', {
    exclude: ['/assets/*path', '/chunks/*path', '/images/*path', '/index.html'],
  });

  // Optimización 7: Shutdown hooks para limpieza adecuada
  app.enableShutdownHooks();

  const usersService = app.get(UsersService);
  await usersService.ensureSuperUserExists();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  
  Logger.log(`🚀 Servidor corriendo en puerto ${port}`, 'Bootstrap');
  Logger.log(`📡 Frontend: http://localhost:${port}/`, 'Bootstrap');
  Logger.log(`📡 API: http://localhost:${port}/api`, 'Bootstrap');
  Logger.log(`📡 WebSockets: ws://localhost:${port}/status`, 'Bootstrap');
}
bootstrap();
