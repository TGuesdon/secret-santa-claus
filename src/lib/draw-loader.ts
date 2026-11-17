import { DrawError } from './draw-error';
import { decode, decrypt, type Encrypted } from './crypto';
import { parseLink } from './link';

export type PublicDraw = { version: 1; entries: Record<string, Encrypted> };
export type Result = { participantName: string; recipientName: string };

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateDraw(value: unknown): PublicDraw {
  try {
    return validatePublicDraw(value);
  } catch (error) {
    if (error instanceof DrawError) {
      throw error;
    }

    // Low-level decoding failures belong to public-file validation here.
    throw new DrawError('invalid-draw');
  }
}

function validatePublicDraw(value: unknown): PublicDraw {
  if (!isObject(value) || value.version !== 1) {
    throw new DrawError('unsupported-version');
  }

  if (
    !isObject(value.entries) ||
    Object.keys(value).some((k) => !['version', 'entries'].includes(k))
  ) {
    throw new DrawError('invalid-draw');
  }

  for (const [id, entry] of Object.entries(value.entries)) {
    if (decode(id).length !== 16) {
      throw new DrawError('invalid-draw');
    }

    validateEntry(entry);
  }

  return value as PublicDraw;
}

function validateEntry(value: unknown): void {
  if (!isObject(value) || typeof value.iv !== 'string' || typeof value.ciphertext !== 'string') {
    throw new DrawError('invalid-draw');
  }

  const validLengths = decode(value.iv).length === 12 && decode(value.ciphertext).length >= 17;
  const unexpectedField = Object.keys(value).some((field) => !['iv', 'ciphertext'].includes(field));

  if (!validLengths || unexpectedField) {
    throw new DrawError('invalid-draw');
  }
}

export async function loadDraw(
  fragment: string,
  url: string,
  fetcher: typeof fetch = fetch,
): Promise<Result> {
  let link: ReturnType<typeof parseLink>;

  try {
    link = parseLink(fragment);
  } catch {
    throw new DrawError('invalid-link');
  }

  const { id, key } = link;
  let draw: PublicDraw;

  try {
    const response = await fetcher(url, { cache: 'no-store', referrerPolicy: 'no-referrer' });

    if (!response.ok) {
      throw new Error();
    }

    draw = validateDraw(await response.json());
  } catch (error) {
    if (error instanceof DrawError) {
      throw error;
    }

    throw new DrawError('load-failed');
  }

  if (!Object.hasOwn(draw.entries, id)) {
    throw new DrawError('not-found');
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
    throw new DrawError('decryption-failed');
  }
}
