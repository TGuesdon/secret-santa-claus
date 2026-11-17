import { eligibleRecipients, findAssignment } from '../src/lib/assignment';
import { ValidationError } from '../src/lib/validation-error';
import { randomInt } from 'node:crypto';
import type { Participant } from './participants';

function shuffle<T>(values: T[]): T[] {
  const shuffled = [...values];

  for (let index = shuffled.length - 1; index > 0; index--) {
    const otherIndex = randomInt(index + 1);

    [shuffled[index], shuffled[otherIndex]] = [shuffled[otherIndex], shuffled[index]];
  }

  return shuffled;
}

export function drawRecipients(participants: Participant[]): Participant[] {
  const candidates = eligibleRecipients(participants).map(shuffle);
  const giverOrder = shuffle(participants.map((_, index) => index));
  const assignment = findAssignment(candidates, giverOrder);

  if (!assignment) {
    throw new ValidationError('impossible-assignment');
  }

  return assignment.map((recipientIndex) => participants[recipientIndex]);
}
