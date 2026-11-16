import { decode, decrypt, type Encrypted } from './crypto';
import { parseLink } from './link';

export type PublicDraw = { version: 1; entries: Record<string, Encrypted> };
export type Result = { participantName: string; recipientName: string };

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateDraw(value: unknown): PublicDraw {
  if (!isObject(value) || value.version !== 1) {
    throw new Error('Unsupported draw version.');
  }

  if (
    !isObject(value.entries) ||
    Object.keys(value).some((k) => !['version', 'entries'].includes(k))
  ) {
    throw new Error('Invalid public draw file.');
  }

  for (const [id, entry] of Object.entries(value.entries)) {
    if (decode(id).length !== 16) {
      throw new Error('Invalid opaque participant identifier.');
    }

    validateEntry(entry);
  }

  return value as PublicDraw;
}

function validateEntry(value: unknown): void {
  if (!isObject(value) || typeof value.iv !== 'string' || typeof value.ciphertext !== 'string') {
    throw new Error('Invalid encrypted entry.');
  }

  const validLengths = decode(value.iv).length === 12 && decode(value.ciphertext).length >= 17;
  const unexpectedField = Object.keys(value).some((field) => !['iv', 'ciphertext'].includes(field));

  if (!validLengths || unexpectedField) {
    throw new Error('Invalid encrypted entry.');
  }
}

export async function loadDraw(
  fragment: string,
  url: string,
  fetcher: typeof fetch = fetch,
): Promise<Result> {
  const { id, key } = parseLink(fragment);
  let draw: PublicDraw;

  try {
    const response = await fetcher(url, { cache: 'no-store', referrerPolicy: 'no-referrer' });

    if (!response.ok) {
      throw new Error();
    }

    draw = validateDraw(await response.json());
  } catch (error) {
    if (error instanceof Error && error.message === 'Unsupported draw version.') {
      throw error;
    }

    throw new Error('Unable to load the draw. Check your connection and try again.');
  }

  if (!Object.hasOwn(draw.entries, id)) {
    throw new Error('No available draw matches this link.');
  }

  try {
    const result = await decrypt(draw.entries[id], key);

    if (!isObject(result)) {
      throw new Error();
    }

    const { participantName, recipientName } = result;

    if (typeof participantName !== 'string' || typeof recipientName !== 'string') {
      throw new Error();
    }

    if (!participantName.trim() || !recipientName.trim()) {
      throw new Error();
    }

    return { participantName, recipientName };
  } catch {
    throw new Error('Unable to decrypt this draw. Check your personal link.');
  }
}
