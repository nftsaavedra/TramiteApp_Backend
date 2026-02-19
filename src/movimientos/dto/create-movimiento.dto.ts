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
  @IsOptional()
  tipoAccion?: TipoAccion;

  @IsString()
  @IsOptional()
  numeroDocumento?: string;

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

  @IsDateString()
  @IsOptional()
  fechaRecepcion?: string;

  @IsDateString()
  @IsOptional()
  fechaMovimiento?: string;

  @IsString()
  @IsOptional()
  oficinaDestinoId?: string;
}
