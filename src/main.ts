import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service'; // <-- AÑADIDO: Importamos el servicio
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  // 2. --- CONFIGURACIÓN CRÍTICA DE VALIDACIÓN ---
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Elimina campos que no estén en el DTO
      forbidNonWhitelisted: true, // Lanza error si envían campos extra
      transform: true, // <--- ESTO ES LA CLAVE: Convierte tipos automáticamente
      transformOptions: {
        enableImplicitConversion: true, // Ayuda con conversiones simples
      },
    }),
  );
  // ------------------------------------------------

  // --- AÑADIDO: Lógica para crear el usuario ADMIN al iniciar ---
  // 1. Obtenemos una instancia del UsersService
  const usersService = app.get(UsersService);
  // 2. Ejecutamos la función para asegurar que el admin exista
  await usersService.ensureSuperUserExists();
  // ---------------------------------------------------------

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
