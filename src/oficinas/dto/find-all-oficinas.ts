import { IsString, IsOptional, IsEnum } from 'class-validator';
import { TipoOficina } from '@prisma/client';

export class FindAllOficinasDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  siglas?: string;

  @IsEnum(TipoOficina)
  @IsOptional()
  tipo?: TipoOficina;

  @IsString() // Se valida como string porque los query params siempre llegan como string
  @IsOptional()
  tree?: string;
}
