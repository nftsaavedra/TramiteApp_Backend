import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { TipoOficina } from '@prisma/client';
import { IsCuid } from '@/common/decorators/is-cuid.decorator';

export class CreateOficinaDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  nombre: string;

  @IsString()
  @IsNotEmpty()
  siglas: string;

  @IsEnum(TipoOficina)
  @IsNotEmpty()
  tipo: TipoOficina;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  @IsCuid({ message: 'El ID del padre debe ser un CUID válido' })
  parentId?: string | null;
}
