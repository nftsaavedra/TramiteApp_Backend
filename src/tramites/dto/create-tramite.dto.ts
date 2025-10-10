
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { PrioridadTramite } from '@prisma/client';

export class CreateTramiteDto {
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

  @IsDateString()
  @IsNotEmpty()
  fechaDocumento: Date;

  // --- IDs de Relaciones ---

  @IsUUID()
  @IsNotEmpty()
  tipoDocumentoId: string;

  @IsUUID()
  @IsNotEmpty()
  oficinaRemitenteId: string;

  @IsUUID()
  @IsOptional()
  usuarioAsignadoId?: string;

}
