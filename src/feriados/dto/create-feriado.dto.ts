import { IsDateString, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateFeriadoDto {
  @IsDateString(
    { strict: true },
    { message: 'La fecha debe estar en formato YYYY-MM-DD' },
  )
  @IsNotEmpty({ message: 'La fecha es obligatoria' })
  fecha: string;

  @IsString()
  @IsNotEmpty({ message: 'La descripción es obligatoria' })
  @MinLength(3)
  descripcion: string;
}
