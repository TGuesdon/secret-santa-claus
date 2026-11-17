import { isObject } from './draw-loader';
import { eligibleRecipients, findAssignment } from './assignment';
import { validateCampaignId } from './link';
import { normalizeName, validateParticipants, type Participant } from './participants';
import { ValidationError } from './validation-error';

export type Configuration = Record<string, Participant[]>;
export type EditorParticipant = { id: string; name: string; email: string; excludedIds: string[] };
export type EditorCampaign = { key: string; id: string; participants: EditorParticipant[] };

export function newParticipant(): EditorParticipant {
  return { id: crypto.randomUUID(), name: '', email: '', excludedIds: [] };
}

export function newCampaign(id = ''): EditorCampaign {
  return { key: crypto.randomUUID(), id, participants: [newParticipant(), newParticipant()] };
}

export function validateConfiguration(value: unknown): Configuration {
  if (!isObject(value) || Object.keys(value).length === 0) {
    throw new ValidationError('invalid-configuration');
  }

  const entries = Object.entries(value).map(([id, input]) => {
    try {
      validateCampaignId(id);
      const participants = validateParticipants(input);

      if (!findAssignment(eligibleRecipients(participants))) {
        throw new ValidationError('impossible-assignment');
      }

      return [id, participants] as const;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ValidationError(error.code, error.participantIndex, id);
      }

      throw error;
    }
  });

  return Object.fromEntries(entries);
}

export function parseConfiguration(json: string): Configuration {
  let value: unknown;

  try {
    value = JSON.parse(json);
  } catch {
    throw new ValidationError('invalid-json');
  }

  if (Array.isArray(value)) {
    value = { campaign: value };
  }

  // Reject unrecognized fields rather than silently dropping a misspelled exclusion rule.
  if (isObject(value)) {
    for (const participants of Object.values(value)) {
      if (!Array.isArray(participants)) {
        continue;
      }

      for (const participant of participants) {
        if (isObject(participant)) {
          const unsupported = Object.keys(participant).some(
            (key) => !['name', 'email', 'exclusions'].includes(key),
          );

          if (unsupported) {
            throw new ValidationError('unsupported-fields');
          }
        }
      }
    }
  }

  return validateConfiguration(value);
}

export function serializeConfiguration(configuration: Configuration): string {
  return JSON.stringify(validateConfiguration(configuration), null, 2) + '\n';
}

export function importEditor(json: string): EditorCampaign[] {
  return Object.entries(parseConfiguration(json)).map(([id, people]) => {
    const participants = people.map((person) => ({ ...newParticipant(), ...person }));
    const ids = new Map(participants.map((person) => [normalizeName(person.name), person.id]));

    return {
      key: crypto.randomUUID(),
      id,
      participants: participants.map((person) => ({
        id: person.id,
        name: person.name,
        email: person.email,
        excludedIds: (person.exclusions ?? []).map((name) => ids.get(normalizeName(name))!),
      })),
    };
  });
}

export function removeParticipant(campaign: EditorCampaign, id: string): EditorCampaign {
  return {
    ...campaign,
    participants: campaign.participants
      .filter((person) => person.id !== id)
      .map((person) => ({
        ...person,
        excludedIds: person.excludedIds.filter((excludedId) => excludedId !== id),
      })),
  };
}

export function exportEditor(campaigns: EditorCampaign[]): Configuration {
  const ids = new Set<string>();
  const entries = campaigns.map((campaign) => {
    if (ids.has(campaign.id)) {
      throw new ValidationError('duplicate-campaign-id', undefined, campaign.id);
    }

    ids.add(campaign.id);
    const names = new Map(campaign.participants.map((person) => [person.id, person.name]));
    const participants = campaign.participants.map((person, index) => {
      const exclusions = person.excludedIds.map((id) => {
        const name = names.get(id);

        if (name === undefined) {
          throw new ValidationError('unknown-exclusion', index, campaign.id);
        }

        return name;
      });

      return {
        name: person.name,
        email: person.email,
        ...(exclusions.length > 0 ? { exclusions } : {}),
      };
    });

    return [campaign.id, participants];
  });

  return validateConfiguration(Object.fromEntries(entries));
}
