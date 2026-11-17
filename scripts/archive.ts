import { decrypt, encrypt, type Encrypted } from '../src/lib/crypto';
import { isObject, validateDraw } from '../src/lib/draw-loader';
import { buildLink, validateBaseUrl, validateCampaignId } from '../src/lib/link';
import { hashText, validateParticipants, type Campaign, type DeliveryRecord } from './campaign';

function stringField(object: Record<string, unknown>, field: string): string {
  const value = object[field];

  if (typeof value !== 'string' || !value) {
    throw new Error(`Missing or invalid archive field: ${field}.`);
  }

  return value;
}

function readHeader(value: unknown): Omit<Campaign, 'records'> {
  if (!isObject(value) || value.version !== 1) {
    throw new Error('Unsupported campaign archive version.');
  }

  const { mode, executor } = value;

  if (mode !== 'demo' && mode !== 'production') {
    throw new Error('Invalid campaign mode.');
  }

  if (executor !== 'local' && executor !== 'github-actions') {
    throw new Error('Invalid campaign executor.');
  }

  const id = stringField(value, 'id');
  const baseUrl = validateBaseUrl(stringField(value, 'baseUrl'));
  const publicHash = stringField(value, 'publicHash');
  const publicJson = stringField(value, 'publicJson');

  validateCampaignId(id);

  if (!/^[a-f0-9]{64}$/.test(publicHash) || hashText(publicJson) !== publicHash) {
    throw new Error('The archive does not match its public data hash.');
  }

  return { version: 1, mode, executor, id, baseUrl, publicHash, publicJson };
}

function readRecord(value: unknown): DeliveryRecord {
  if (!isObject(value)) {
    throw new Error('Invalid delivery record.');
  }

  const { status, messageId } = value;

  if (status !== 'pending' && status !== 'sending' && status !== 'sent') {
    throw new Error('Invalid delivery status.');
  }

  if (messageId !== undefined && (typeof messageId !== 'string' || !messageId)) {
    throw new Error('Invalid email Message-ID.');
  }

  if (status === 'sent' && !messageId) {
    throw new Error('A confirmed delivery must have an email Message-ID.');
  }

  const exclusions = value.exclusions;

  if (exclusions !== undefined) {
    if (!Array.isArray(exclusions) || exclusions.some((name) => typeof name !== 'string')) {
      throw new Error('Invalid archived participant exclusions.');
    }
  }

  return {
    ...(exclusions !== undefined ? { exclusions: exclusions as string[] } : {}),
    name: stringField(value, 'name'),
    email: stringField(value, 'email'),
    id: stringField(value, 'id'),
    key: stringField(value, 'key'),
    recipientName: stringField(value, 'recipientName'),
    url: stringField(value, 'url'),
    status,
    ...(messageId ? { messageId } : {}),
  };
}

export function validateCampaign(value: unknown): Campaign {
  const header = readHeader(value);

  if (!isObject(value) || !Array.isArray(value.records)) {
    throw new Error('Missing campaign delivery records.');
  }

  const savedRecords = value.records.map(readRecord);
  const participants = validateParticipants(savedRecords);
  const records = savedRecords.map((record, index) => ({ ...record, ...participants[index] }));
  const names = new Set(participants.map((participant) => participant.name));
  const publicDraw = validateDraw(JSON.parse(header.publicJson));
  const ids = new Set<string>();
  const keys = new Set<string>();
  const recipients = new Set<string>();

  for (const record of records) {
    const validRecipient = names.has(record.recipientName) && record.recipientName !== record.name;
    const duplicate =
      ids.has(record.id) || keys.has(record.key) || recipients.has(record.recipientName);

    const excludedRecipient = record.exclusions?.includes(record.recipientName) ?? false;

    if (!validRecipient || duplicate || excludedRecipient) {
      throw new Error('Invalid or duplicate campaign assignment.');
    }

    if (!Object.hasOwn(publicDraw.entries, record.id)) {
      throw new Error('A delivery record is missing from the public draw.');
    }

    if (
      buildLink(
        header.baseUrl,
        record.id,
        record.key,
        header.mode === 'demo' ? undefined : header.id,
      ) !== record.url
    ) {
      throw new Error('A personal URL does not match its record.');
    }

    ids.add(record.id);
    keys.add(record.key);
    recipients.add(record.recipientName);
  }

  if (Object.keys(publicDraw.entries).length !== records.length) {
    throw new Error('Unexpected entries in the public draw.');
  }

  return { ...header, records };
}

export async function sealArchive(campaign: Campaign, key: string) {
  validateCampaign(campaign);

  return { version: 1, ...(await encrypt(campaign, key)) };
}

export async function openArchive(value: unknown, key: string): Promise<Campaign> {
  if (!isObject(value) || value.version !== 1) {
    throw new Error('Unsupported encrypted archive version.');
  }

  const encrypted: Encrypted = {
    iv: stringField(value, 'iv'),
    ciphertext: stringField(value, 'ciphertext'),
  };

  return validateCampaign(await decrypt(encrypted, key));
}
