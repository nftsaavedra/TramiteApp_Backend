import {
  IsBoolean,
  IsEnum, // <-- AÑADIDO: Para validar contra el Enum
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { TipoOficina } from '@prisma/client';

export class CreateOficinaDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  nombre: string;

  @IsString()
  @IsNotEmpty()
  siglas: string;

  // --- CAMBIO: De IsString a IsEnum ---
  @IsEnum(TipoOficina) // Ahora valida contra los valores definidos
  @IsNotEmpty()
  tipo: TipoOficina; // El tipo de dato ahora es el Enum

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  parentId?: string | null;
}
