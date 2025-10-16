// En: src/tramites/dto/find-all-tramites.dto.ts

import { IsString, IsOptional, IsEnum, IsNumberString } from 'class-validator';
import { EstadoTramite, PrioridadTramite } from '@prisma/client';

export class FindAllTramitesDto {
  @IsString()
  @IsOptional()
  q?: string; // Búsqueda global por asunto o n° de documento

  @IsEnum(EstadoTramite)
  @IsOptional()
  estado?: EstadoTramite; // Filtro por estado

  @IsEnum(PrioridadTramite)
  @IsOptional()
  prioridad?: PrioridadTramite; // Filtro por prioridad

  @IsNumberString()
  @IsOptional()
  page?: string; // Para paginación

  @IsNumberString()
  @IsOptional()
  limit?: string; // Límite de resultados por página

  @IsString()
  @IsOptional()
  sortBy?: string; // Campo y dirección para ordenar (ej: "fechaIngreso:desc")
}
