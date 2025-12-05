import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsCuid(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isCuid',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          // Si es null o undefined y no es opcional, otras validaciones lo atraparán.
          // Aquí validamos que SI hay valor, sea string y parezca CUID.
          if (typeof value !== 'string') return false;
          // Regex para CUID v1 (empieza con c, 25 caracteres, alfanumérico)
          // Ejemplo: cjhg123...
          return /^c[a-z0-9]{24}$/.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid CUID`;
        },
      },
    });
  };
}
