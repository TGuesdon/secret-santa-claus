export type Encrypted = { iv: string; ciphertext: string };

export function encode(bytes: Uint8Array): string {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decode(value: string): Uint8Array<ArrayBuffer> {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) {
    throw new Error('Invalid base64url encoding.');
  }

  const bytes = Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), (c) =>
    c.charCodeAt(0),
  );

  if (encode(bytes) !== value) {
    throw new Error('Non-canonical base64url encoding.');
  }

  return bytes;
}

export function randomToken(length: number): string {
  return encode(crypto.getRandomValues(new Uint8Array(length)));
}

async function importKey(value: string, usage: KeyUsage) {
  const bytes = decode(value);

  if (bytes.length !== 32) {
    throw new Error('Invalid AES key.');
  }

  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, [usage]);
}

export async function encrypt(value: unknown, key: string): Promise<Encrypted> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cryptoKey = await importKey(key, 'encrypt');
  const plaintext = new TextEncoder().encode(JSON.stringify(value));

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    cryptoKey,
    plaintext,
  );

  // Web Crypto appends the authentication tag to the ciphertext.
  return { iv: encode(iv), ciphertext: encode(new Uint8Array(ciphertext)) };
}

export async function decrypt(value: Encrypted, key: string): Promise<unknown> {
  const iv = decode(value.iv);
  const ciphertext = decode(value.ciphertext);

  if (iv.length !== 12 || ciphertext.length < 17) {
    throw new Error('Invalid encrypted data.');
  }

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    await importKey(key, 'decrypt'),
    ciphertext,
  );

  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(plaintext));
}
