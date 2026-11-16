import { createHash, randomInt } from 'node:crypto';
import { encrypt, randomToken } from '../src/lib/crypto';
import { buildLink, validateBaseUrl } from '../src/lib/link';
import type { PublicDraw } from '../src/lib/draw-loader';
import { validateParticipants, type Participant } from './participants';

export { validateParticipants } from './participants';
export type { Participant } from './participants';

export type DeliveryRecord = Participant & {
  id: string;
  key: string;
  recipientName: string;
  url: string;
  status: 'pending' | 'sending' | 'sent';
  messageId?: string;
};
export type Campaign = {
  version: 1;
  mode: 'demo' | 'production';
  id: string;
  executor: 'local' | 'github-actions';
  baseUrl: string;
  publicHash: string;
  publicJson: string;
  records: DeliveryRecord[];
};
export type CampaignOptions = { id: string; baseUrl: string; executor: Campaign['executor'] };
export type DemoIdentity = Participant & { id: string; key: string; recipientName: string };

export function serializeDraw(draw: PublicDraw): string {
  return JSON.stringify(draw, null, 2) + '\n';
}

export function hashText(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function drawRecipients(participants: Participant[]): Participant[] {
  let recipients: Participant[];

  // Fisher–Yates followed by rejection of permutations containing self-assignments.
  do {
    recipients = [...participants];

    for (let i = recipients.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);

      [recipients[i], recipients[j]] = [recipients[j], recipients[i]];
    }
  } while (recipients.some((recipient, index) => recipient.name === participants[index].name));

  return recipients;
}

export async function createCampaign(
  input: unknown,
  options: CampaignOptions,
  demo?: DemoIdentity[],
) {
  const participants = validateParticipants(input);

  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(options.id)) {
    throw new Error('Invalid campaign identifier.');
  }

  const baseUrl = validateBaseUrl(options.baseUrl);
  const recipients = drawRecipients(participants);
  const publicDraw: PublicDraw = { version: 1, entries: {} };
  const records: DeliveryRecord[] = [];

  for (const [index, participant] of participants.entries()) {
    const identity = demo?.find((fixture) => fixture.name === participant.name);

    if (demo && !identity) {
      throw new Error('Invalid demo fixtures.');
    }

    const id = identity?.id ?? randomToken(16);
    const key = identity?.key ?? randomToken(32);
    const recipientName = identity?.recipientName ?? recipients[index].name;

    if (Object.hasOwn(publicDraw.entries, id)) {
      throw new Error('Duplicate opaque identifier.');
    }

    const url = buildLink(baseUrl, id, key);
    const plaintext = { participantName: participant.name, recipientName };

    publicDraw.entries[id] = await encrypt(plaintext, key);
    records.push({ ...participant, id, key, recipientName, url, status: 'pending' });
  }

  const publicJson = serializeDraw(publicDraw);
  const campaign: Campaign = {
    version: 1,
    mode: demo ? 'demo' : 'production',
    id: options.id,
    executor: options.executor,
    baseUrl,
    publicHash: hashText(publicJson),
    publicJson,
    records,
  };

  return { campaign, publicDraw };
}
