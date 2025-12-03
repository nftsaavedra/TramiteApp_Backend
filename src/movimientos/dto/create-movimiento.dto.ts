import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { TipoAccion } from '@prisma/client';

export class CreateMovimientoDto {
  @IsEnum(TipoAccion)
  @IsNotEmpty()
  tipoAccion: TipoAccion;

  // Número manual 'XXX', opcional para los movimientos.
  @IsString()
  @IsOptional()
  numeroDocumento?: string;

  // NUEVO: Asunto específico del movimiento
  @IsString()
  @IsOptional()
  asunto?: string;

  @IsString()
  @IsOptional()
  notas?: string;

  @IsString()
  @IsOptional()
  observaciones?: string;

  @IsNotEmpty()
  tramiteId: string;

  @IsString()
  @IsOptional()
  tipoDocumentoId?: string;

  // Se recomienda string ISO 8601 para evitar problemas de timezone al recibir el JSON
  @IsDateString()
  @IsOptional()
  fechaDocumento?: string;

  // CAMBIO: Destino directo único (1:1)
  // Reemplaza al array 'destinos' y la clase 'DestinoDto'
  @IsString()
  @IsOptional()
  oficinaDestinoId?: string;
}
