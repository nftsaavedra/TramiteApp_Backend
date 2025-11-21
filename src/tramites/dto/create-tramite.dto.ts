import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { PrioridadTramite } from '@prisma/client';

enum TipoRegistroTramite {
  RECEPCION = 'RECEPCION',
  ENVIO = 'ENVIO',
}

export class CreateTramiteDto {
  @IsEnum(TipoRegistroTramite)
  @IsNotEmpty()
  tipoRegistro: TipoRegistroTramite;

  @IsString()
  @IsNotEmpty()
  numeroDocumento: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  asunto: string;

  @IsString()
  @IsOptional()
  notas?: string;

  @IsString()
  @IsOptional()
  observaciones?: string;

  @IsEnum(PrioridadTramite)
  @IsOptional()
  prioridad?: PrioridadTramite;

  // CAMBIO 1: Asegurar que valide string ISO, pero el tipo TS sea string para evitar conflictos de transformación automática
  @IsDateString()
  @IsNotEmpty()
  fechaDocumento: string;

  // --- IDs de Relaciones ---

  // CAMBIO 2: Usar @IsString() en lugar de @IsUUID() porque usas CUIDs en Prisma
  @IsString()
  @IsNotEmpty()
  tipoDocumentoId: string;

  @IsString()
  @IsOptional()
  oficinaRemitenteId?: string;

  @IsString()
  @IsOptional()
  oficinaDestinoId?: string;

  @IsString()
  @IsOptional()
  usuarioAsignadoId?: string;
}
