import { IsNotEmpty, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateAnotacioneDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  contenido: string;

  @IsUUID()
  @IsNotEmpty()
  tramiteId: string;
}
