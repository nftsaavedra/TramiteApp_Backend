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

// 1. Definimos el enum para el tipo de registro
enum TipoRegistroTramite {
  RECEPCION = 'RECEPCION',
  ENVIO = 'ENVIO',
}

export class CreateTramiteDto {
  // --- CAMPO AÑADIDO (Control de Flujo) ---
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

  @IsDateString()
  @IsNotEmpty()
  fechaDocumento: Date;

  // --- IDs de Relaciones (Ajustados) ---

  @IsUUID()
  @IsNotEmpty()
  tipoDocumentoId: string;

  // 2. Ajustado a Opcional (Requerido solo para RECEPCION)
  @IsUUID()
  @IsOptional()
  oficinaRemitenteId?: string;

  // 3. CAMPO AÑADIDO (Requerido solo para ENVIO)
  @IsUUID()
  @IsOptional()
  oficinaDestinoId?: string;

  @IsUUID()
  @IsOptional()
  usuarioAsignadoId?: string;
}
