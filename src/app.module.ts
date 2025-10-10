import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { OficinasModule } from './oficinas/oficinas.module';
import { TiposDocumentoModule } from './tipos-documento/tipos-documento.module';
import { TramitesModule } from './tramites/tramites.module';
import { MovimientosModule } from './movimientos/movimientos.module';
import { AnotacionesModule } from './anotaciones/anotaciones.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule, UsersModule, AuthModule, OficinasModule, TiposDocumentoModule, TramitesModule, MovimientosModule, AnotacionesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
