import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Role } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsCuid } from '@/common/decorators/is-cuid.decorator';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;

  @IsEnum(Role)
  @IsNotEmpty()
  role: Role;

  @IsCuid({ message: 'El ID de la oficina debe ser un CUID válido' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  oficinaId?: string | null;
}
