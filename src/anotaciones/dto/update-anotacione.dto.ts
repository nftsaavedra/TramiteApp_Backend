import { PartialType } from '@nestjs/mapped-types';
import { CreateAnotacioneDto } from './create-anotacione.dto';

export class UpdateAnotacioneDto extends PartialType(CreateAnotacioneDto) {}
