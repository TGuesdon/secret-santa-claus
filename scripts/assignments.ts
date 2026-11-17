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
  const eligibleRecipients = participants.map((participant, giverIndex) => {
    const exclusions = new Set(participant.exclusions);

    return shuffle(
      participants.flatMap((recipient, recipientIndex) => {
        if (giverIndex === recipientIndex || exclusions.has(recipient.name)) {
          return [];
        }

        return [recipientIndex];
      }),
    );
  });
  const giverByRecipient = new Map<number, number>();

  // Augmenting paths can reassign earlier gifts, avoiding dead ends from greedy choices.
  function assign(giverIndex: number, visitedRecipients: Set<number>): boolean {
    for (const recipientIndex of eligibleRecipients[giverIndex]) {
      if (visitedRecipients.has(recipientIndex)) {
        continue;
      }

      visitedRecipients.add(recipientIndex);
      const previousGiver = giverByRecipient.get(recipientIndex);

      if (previousGiver === undefined || assign(previousGiver, visitedRecipients)) {
        giverByRecipient.set(recipientIndex, giverIndex);

        return true;
      }
    }

    return false;
  }

  for (const giverIndex of shuffle(participants.map((_, index) => index))) {
    if (!assign(giverIndex, new Set())) {
      throw new Error('No valid assignment satisfies the participant exclusions.');
    }
  }

  const recipients: Participant[] = new Array(participants.length);

  for (const [recipientIndex, giverIndex] of giverByRecipient) {
    recipients[giverIndex] = participants[recipientIndex];
  }

  return recipients;
}
