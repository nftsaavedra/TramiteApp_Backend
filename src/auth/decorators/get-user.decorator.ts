import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import { User } from '@prisma/client';

export const GetUser = createParamDecorator(
  (data: keyof User, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as User;

    if (!user) {
      throw new InternalServerErrorException(
        'Usuario no encontrado en la petición (request)',
      );
    }

    return data ? user[data] : user;
  },
);
