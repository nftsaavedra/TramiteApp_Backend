import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { ValidationPipe, Logger } from '@nestjs/common';
import compression from 'compression';
import helmet from 'helmet';
import { Logger as PinoLogger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Optimización 1: Logging estructurado con Pino
  app.useLogger(app.get(PinoLogger));

  // Optimización 2: Compresión HTTP (reduce payload ~60-80%)
  app.use(compression());

  // Optimización 3: Seguridad con Helmet headers
  app.use(helmet());

  // Optimización 4: CORS configurado
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:5174';
  const allowedOrigins = corsOrigin.split(',').map(origin => origin.trim());
  
  app.enableCors({
    origin: function (origin, callback) {
      // Permitir solicitudes sin origen (como mobile apps o postman)
      if (!origin) return callback(null, true);
      
      // Verificar si el origen está en la lista permitida
      if (allowedOrigins.indexOf(origin) !== -1 || origin === 'http://localhost:5173' || origin === 'http://localhost:5174' || origin === 'http://127.0.0.1:5173' || origin === 'http://127.0.0.1:5174') {
        callback(null, true);
      } else {
        callback(new Error('No allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    maxAge: 86400, // 24 horas
  });

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
  app.setGlobalPrefix('api');

  // Optimización 7: Shutdown hooks para limpieza adecuada
  app.enableShutdownHooks();

  const usersService = app.get(UsersService);
  await usersService.ensureSuperUserExists();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  
  Logger.log(`🚀 Servidor corriendo en puerto ${port}`, 'Bootstrap');
  Logger.log(`📡 WebSockets disponibles en ws://localhost:${port}/status`, 'Bootstrap');
}
bootstrap();
