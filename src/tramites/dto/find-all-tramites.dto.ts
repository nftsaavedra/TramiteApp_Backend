import {
  IsEnum,
  IsOptional,
  IsString,
  IsArray,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { EstadoTramite, PrioridadTramite } from '@prisma/client';

export class FindAllTramitesDto {
  @IsOptional()
  @IsString()
  q?: string;

  // --- FILTROS MÚLTIPLES ---

  @IsOptional()
  // Transforma "ABIERTO,CERRADO" -> ['ABIERTO', 'CERRADO']
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',') : value,
  )
  @IsEnum(EstadoTramite, { each: true })
  estado?: EstadoTramite[];

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',') : value,
  )
  @IsEnum(PrioridadTramite, { each: true })
  prioridad?: PrioridadTramite[];

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',') : value,
  )
  @IsArray()
  @IsString({ each: true })
  oficinaId?: string[]; // Filtra por IDs de oficina

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',') : value,
  )
  @IsArray()
  @IsString({ each: true })
  tipoDocumentoId?: string[]; // Filtra por IDs de tipo documento

  // --- PAGINACIÓN Y ORDEN ---

  @IsOptional()
  page?: string;

  @IsOptional()
  limit?: string;

  @IsOptional()
  sortBy?: string;
}
