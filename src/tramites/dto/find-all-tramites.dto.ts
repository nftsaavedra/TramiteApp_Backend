import {
  IsEnum,
  IsOptional,
  IsString,
  IsArray,
  IsISO8601,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { EstadoTramite, PrioridadTramite } from '@prisma/client';

export class FindAllTramitesDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
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
  oficinaId?: string[];

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',') : value,
  )
  @IsArray()
  @IsString({ each: true })
  tipoDocumentoId?: string[];

  @IsOptional()
  @IsISO8601()
  fechaRecepcionDesde?: string;

  @IsOptional()
  @IsISO8601()
  fechaRecepcionHasta?: string;

  @IsOptional()
  @IsISO8601()
  creadoDesde?: string;

  @IsOptional()
  @IsISO8601()
  creadoHasta?: string;

  @IsOptional()
  page?: string;

  @IsOptional()
  limit?: string;

  @IsOptional()
  sortBy?: string;
}
