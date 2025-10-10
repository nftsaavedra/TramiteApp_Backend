import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service'; // <-- AÑADIDO: Importamos el servicio

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // --- AÑADIDO: Lógica para crear el usuario ADMIN al iniciar ---
  // 1. Obtenemos una instancia del UsersService
  const usersService = app.get(UsersService);
  // 2. Ejecutamos la función para asegurar que el admin exista
  await usersService.ensureSuperUserExists();
  // ---------------------------------------------------------

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
