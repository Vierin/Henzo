import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { containsEmbeddedLink } from '../../lib/text-content';

@ValidatorConstraint({ name: 'noEmbeddedLinks', async: false })
export class NoEmbeddedLinksConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value == null || value === '') return true;
    if (typeof value !== 'string') return false;
    return !containsEmbeddedLink(value);
  }

  defaultMessage(): string {
    return 'Links are not allowed in this field';
  }
}

export function NoEmbeddedLinks(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: NoEmbeddedLinksConstraint,
    });
  };
}
