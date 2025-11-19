import {
  IsOptional,
  IsString,
  IsArray,
  IsBooleanString,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class FindAllUsersDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',') : value,
  )
  @IsArray()
  @IsString({ each: true })
  role?: string[];

  @IsOptional()
  @IsBooleanString()
  activo?: string; // 'true' | 'false'

  @IsOptional() page?: string;
  @IsOptional() limit?: string;
  @IsOptional() sortBy?: string;
}
