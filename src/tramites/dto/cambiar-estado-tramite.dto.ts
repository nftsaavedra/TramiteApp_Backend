import { IsNotEmpty, IsString } from 'class-validator';

export class CambiarEstadoTramiteDto {
  @IsString()
  @IsNotEmpty({
    message: 'La nota u observación es obligatoria para esta acción.',
  })
  contenido: string;
}
