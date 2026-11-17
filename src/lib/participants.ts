import { isObject } from './draw-loader';
import { ValidationError } from './validation-error';

export type Participant = {
  name: string;
  email: string;
  exclusions?: string[];
};

export function normalizeName(name: string): string {
  return name.trim().normalize('NFC').toLocaleLowerCase('fr');
}

export function validateName(name: string): void {
  const hasControlCharacters = /\p{Cc}/u.test(name);

  if (!name.trim() || name.length > 120 || hasControlCharacters) {
    throw new ValidationError('invalid-name');
  }
}

export function validateEmail(email: string): void {
  const emailPattern = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  const hasEmptySegment = email.includes('..');

  if (email.length > 254 || !emailPattern.test(email) || hasEmptySegment) {
    throw new ValidationError('invalid-email');
  }
}

export function validateParticipants(value: unknown): Participant[] {
  if (!Array.isArray(value) || value.length < 2 || value.length > 500) {
    throw new ValidationError('participant-count');
  }

  const names = new Set<string>();
  const emails = new Set<string>();
  const participants: Participant[] = [];

  for (const [index, participant] of value.entries()) {
    if (!isObject(participant)) {
      throw new ValidationError('invalid-participant', index);
    }

    if (typeof participant.name !== 'string' || typeof participant.email !== 'string') {
      throw new ValidationError('missing-fields', index);
    }

    const name = participant.name.trim().normalize('NFC');
    const email = participant.email.trim();

    try {
      validateName(name);
      validateEmail(email);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ValidationError(error.code, index);
      }

      throw error;
    }

    // Normalize names and addresses before checking for duplicate participants.
    const normalizedName = normalizeName(name);
    const normalizedEmail = email.toLowerCase();

    if (names.has(normalizedName)) {
      throw new ValidationError('duplicate-name', index);
    }

    if (emails.has(normalizedEmail)) {
      throw new ValidationError('duplicate-email', index);
    }

    names.add(normalizedName);
    emails.add(normalizedEmail);
    participants.push({ name, email });
  }

  const participantsByName = new Map(
    participants.map((participant) => [normalizeName(participant.name), participant]),
  );

  for (const [index, participant] of participants.entries()) {
    const exclusions: unknown = value[index].exclusions;

    if (exclusions === undefined) {
      continue;
    }

    if (!Array.isArray(exclusions)) {
      throw new ValidationError('invalid-exclusions', index);
    }

    const excludedNames = new Set<string>();

    for (const exclusion of exclusions) {
      if (typeof exclusion !== 'string') {
        throw new ValidationError('invalid-exclusions', index);
      }

      const normalizedName = normalizeName(exclusion);
      const excludedParticipant = participantsByName.get(normalizedName);

      if (excludedParticipant === participant) {
        throw new ValidationError('self-exclusion', index);
      }

      if (!excludedParticipant) {
        throw new ValidationError('unknown-exclusion', index);
      }

      if (excludedNames.has(excludedParticipant.name)) {
        throw new ValidationError('duplicate-exclusion', index);
      }

      excludedNames.add(excludedParticipant.name);
    }

    participant.exclusions = [...excludedNames];
  }

  return participants;
}
