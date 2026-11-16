import { decode } from './crypto';

export function parseLink(fragment: string): { id: string; key: string } {
  const match = /^#v1\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(fragment);

  try {
    if (!match || decode(match[1]).length !== 16 || decode(match[2]).length !== 32) {
      throw new Error();
    }

    return { id: match[1], key: match[2] };
  } catch {
    throw new Error('Incomplete or invalid personal link.');
  }
}

export function validateBaseUrl(value: string): string {
  const url = new URL(value);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  const secureProtocol = url.protocol === 'https:' || (local && url.protocol === 'http:');
  const unexpectedParts = url.hash || url.search || url.username || url.password;

  if (!secureProtocol || unexpectedParts || !url.pathname.endsWith('/')) {
    throw new Error(
      'PUBLIC_BASE_URL must be an HTTPS URL ending with /, without credentials, query or fragment. HTTP is allowed on localhost.',
    );
  }

  return url.href;
}

export function buildLink(baseUrl: string, id: string, key: string): string {
  parseLink(`#v1.${id}.${key}`);

  return `${validateBaseUrl(baseUrl)}#v1.${id}.${key}`;
}
