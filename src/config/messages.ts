import { ValidationError } from '../lib/validation-error';
import { wording } from '../locales/fr';

export function validationMessage(error: unknown): string {
  if (error instanceof ValidationError) {
    return wording.config.validation[error.code];
  }

  return wording.config.unexpected;
}

export function fieldValidator(validate: (value: string) => void, normalize = true) {
  return (value: string): string | undefined => {
    try {
      validate(normalize ? value.trim().normalize('NFC') : value);
    } catch (error) {
      return validationMessage(error);
    }
  };
}
