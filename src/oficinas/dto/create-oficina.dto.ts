import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateOficinaDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  nombre: string;

  @IsString()
  @IsNotEmpty()
  siglas: string;

  @IsString()
  @IsNotEmpty()
  tipo: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  // Para especificar la oficina padre. Es opcional.
  @IsUUID()
  @IsOptional()
  parentId?: string | null;
}
