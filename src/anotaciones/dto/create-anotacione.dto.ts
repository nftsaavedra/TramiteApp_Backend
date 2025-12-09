import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { IsCuid } from '@/common/decorators/is-cuid.decorator';

export class CreateAnotacioneDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  contenido: string;

  @IsCuid({ message: 'El ID del trámite debe ser un CUID válido' })
  @IsNotEmpty()
  tramiteId: string;

  @IsCuid({ message: 'El ID del movimiento debe ser un CUID válido' })
  @IsOptional()
  movimientoId?: string;
}
