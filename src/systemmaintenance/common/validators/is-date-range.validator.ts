import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export function IsAfter(property: string, options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      constraints: [property],
      options,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [related] = args.constraints;

          const from = (args.object as any)[related];

          if (!from || !value) {
            return true;
          }

          return new Date(value) > new Date(from);
        },
      },
    });
  };
}
