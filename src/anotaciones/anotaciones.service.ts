import { Injectable } from '@nestjs/common';
import { CreateAnotacioneDto } from './dto/create-anotacione.dto';
import { UpdateAnotacioneDto } from './dto/update-anotacione.dto';

@Injectable()
export class AnotacionesService {
  create(createAnotacioneDto: CreateAnotacioneDto) {
    return 'This action adds a new anotacione';
  }

  findAll() {
    return `This action returns all anotaciones`;
  }

  findOne(id: number) {
    return `This action returns a #${id} anotacione`;
  }

  update(id: number, updateAnotacioneDto: UpdateAnotacioneDto) {
    return `This action updates a #${id} anotacione`;
  }

  remove(id: number) {
    return `This action removes a #${id} anotacione`;
  }
}
