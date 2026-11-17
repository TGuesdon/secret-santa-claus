import type { Participant } from './participants';

export function eligibleRecipients(participants: Participant[]): number[][] {
  return participants.map((participant, giverIndex) => {
    const exclusions = new Set(participant.exclusions);

    return participants.flatMap((recipient, recipientIndex) => {
      if (giverIndex === recipientIndex || exclusions.has(recipient.name)) {
        return [];
      }

      return [recipientIndex];
    });
  });
}

// Matching is deterministic here; only the CLI randomizes candidate and giver order.
export function findAssignment(
  eligibleRecipients: number[][],
  giverOrder = eligibleRecipients.map((_, index) => index),
): number[] | null {
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

  for (const giverIndex of giverOrder) {
    if (!assign(giverIndex, new Set())) {
      return null;
    }
  }

  const recipients: number[] = new Array(eligibleRecipients.length);

  for (const [recipientIndex, giverIndex] of giverByRecipient) {
    recipients[giverIndex] = recipientIndex;
  }

  return recipients;
}
