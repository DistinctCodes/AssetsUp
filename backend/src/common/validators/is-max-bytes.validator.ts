import { ValidationOptions, registerDecorator } from 'class-validator';

/** Fails when the UTF-8 encoding of a string exceeds `max` bytes. */
export function IsMaxBytes(max: number, options?: ValidationOptions) {
  return (target: object, propertyName: string) =>
    registerDecorator({
      name: 'isMaxBytes',
      target: target.constructor,
      propertyName,
      constraints: [max],
      options: {
        message: `${propertyName} must be at most ${max} bytes long`,
        ...options,
      },
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && Buffer.byteLength(value, 'utf8') <= max,
      },
    });
}
