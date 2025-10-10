import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoAccion, TipoDestino } from '@prisma/client';

class DestinoDto {
  @IsUUID()
  @IsNotEmpty()
  oficinaDestinoId: string;

  @IsEnum(TipoDestino)
  @IsOptional()
  tipoDestino?: TipoDestino;
}

export class CreateMovimientoDto {
  @IsEnum(TipoAccion)
  @IsNotEmpty()
  tipoAccion: TipoAccion;

  // --- CAMPO AÑADIDO ---
  // Número manual 'XXX', opcional para los movimientos.
  @IsString()
  @IsOptional()
  numeroDocumento?: string;

  @IsString()
  @IsOptional()
  notas?: string;

  @IsString()
  @IsOptional()
  observaciones?: string;

  @IsUUID()
  @IsNotEmpty()
  tramiteId: string;

  @IsUUID()
  @IsOptional()
  tipoDocumentoId?: string;

  @IsDateString()
  @IsOptional()
  fechaDocumento?: Date;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DestinoDto)
  destinos: DestinoDto[];
}
