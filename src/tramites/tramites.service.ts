import { Injectable } from '@nestjs/common';
import { CreateTramiteDto } from './dto/create-tramite.dto';
import { UpdateTramiteDto } from './dto/update-tramite.dto';

@Injectable()
export class TramitesService {
  create(createTramiteDto: CreateTramiteDto) {
    return 'This action adds a new tramite';
  }

  findAll() {
    return `This action returns all tramites`;
  }

  findOne(id: number) {
    return `This action returns a #${id} tramite`;
  }

  update(id: number, updateTramiteDto: UpdateTramiteDto) {
    return `This action updates a #${id} tramite`;
  }

  remove(id: number) {
    return `This action removes a #${id} tramite`;
  }
}
