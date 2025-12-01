import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoAccion, TipoDestino } from '@prisma/client';

class DestinoDto {
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

  @IsNotEmpty()
  tramiteId: string;

  @IsOptional()
  tipoDocumentoId?: string;

  // @IsDateString()
  @IsOptional()
  fechaDocumento?: Date;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DestinoDto)
  destinos: DestinoDto[];
}
