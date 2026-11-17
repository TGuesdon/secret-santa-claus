import { isObject } from '../src/lib/draw-loader';

export type Participant = {
  name: string;
  email: string;
  exclusions?: string[];
};

export function validateName(name: string): void {
  const hasControlCharacters = /\p{Cc}/u.test(name);

  if (!name.trim() || name.length > 120 || hasControlCharacters) {
    throw new Error('Names must contain 1 to 120 characters without control characters.');
  }
}

export function validateEmail(email: string): void {
  const emailPattern = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  const hasEmptySegment = email.includes('..');

  if (email.length > 254 || !emailPattern.test(email) || hasEmptySegment) {
    throw new Error('Invalid email address.');
  }
}

export function validateParticipants(value: unknown): Participant[] {
  if (!Array.isArray(value) || value.length < 2 || value.length > 500) {
    throw new Error('A campaign requires 2 to 500 participants.');
  }

  const names = new Set<string>();
  const emails = new Set<string>();
  const participants: Participant[] = [];

  for (const participant of value) {
    if (!isObject(participant)) {
      throw new Error('Each participant must have a name and an email address.');
    }

    if (typeof participant.name !== 'string' || typeof participant.email !== 'string') {
      throw new Error('Missing name or email address.');
    }

    const name = participant.name.trim().normalize('NFC');
    const email = participant.email.trim();

    validateName(name);
    validateEmail(email);

    // Normalize names and addresses before checking for duplicate participants.
    const normalizedName = name.toLocaleLowerCase('fr');
    const normalizedEmail = email.toLowerCase();

    if (names.has(normalizedName) || emails.has(normalizedEmail)) {
      throw new Error('Duplicate participant name or email address.');
    }

    names.add(normalizedName);
    emails.add(normalizedEmail);
    participants.push({ name, email });
  }

  const participantsByName = new Map(
    participants.map((participant) => [participant.name.toLocaleLowerCase('fr'), participant]),
  );

  for (const [index, participant] of participants.entries()) {
    const exclusions: unknown = value[index].exclusions;

    if (exclusions === undefined) {
      continue;
    }

    if (!Array.isArray(exclusions)) {
      throw new Error('Participant exclusions must be an array of names.');
    }

    const excludedNames = new Set<string>();

    for (const exclusion of exclusions) {
      if (typeof exclusion !== 'string') {
        throw new Error('Participant exclusions must contain names.');
      }

      const normalizedName = exclusion.trim().normalize('NFC').toLocaleLowerCase('fr');
      const excludedParticipant = participantsByName.get(normalizedName);

      if (!excludedParticipant || excludedParticipant === participant) {
        throw new Error('An exclusion must name another participant in this campaign.');
      }

      if (excludedNames.has(excludedParticipant.name)) {
        throw new Error('Duplicate participant exclusion.');
      }

      excludedNames.add(excludedParticipant.name);
    }

    participant.exclusions = [...excludedNames];
  }

  return participants;
}
