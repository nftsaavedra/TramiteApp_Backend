import { PartialType } from '@nestjs/mapped-types';
import { CreateTiposDocumentoDto } from './create-tipos-documento.dto';

export class UpdateTiposDocumentoDto extends PartialType(CreateTiposDocumentoDto) {}
