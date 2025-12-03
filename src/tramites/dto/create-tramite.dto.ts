import {
  IsArray,
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
  observaciones?: string;

  @IsEnum(PrioridadTramite)
  @IsOptional()
  prioridad?: PrioridadTramite;

  // CAMBIO: Renombrado a fechaRecepcion. Debe incluir hora.
  @IsDateString()
  @IsNotEmpty()
  fechaRecepcion: string;

  // --- IDs de Relaciones ---

  @IsString()
  @IsNotEmpty()
  tipoDocumentoId: string;

  @IsString()
  @IsOptional()
  oficinaRemitenteId?: string;

  @IsString()
  @IsOptional()
  oficinaDestinoId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  copiasIds?: string[];

  @IsString()
  @IsOptional()
  usuarioAsignadoId?: string;
}
