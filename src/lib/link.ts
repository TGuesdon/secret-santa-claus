import { ValidationError } from './validation-error';
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

export function validateCampaignId(id: string): string {
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) {
    throw new ValidationError('invalid-campaign-id');
  }

  return id;
}

export function drawPath(campaignId?: string): string {
  if (campaignId === undefined) {
    return 'draws.json';
  }

  return `campaigns/${validateCampaignId(campaignId)}/draws.json`;
}

export function campaignFromSearch(search: string): string | undefined {
  const parameters = new URLSearchParams(search);
  const campaigns = parameters.getAll('campaign');

  if (campaigns.length === 0) {
    return undefined;
  }

  if (campaigns.length !== 1) {
    throw new ValidationError('invalid-campaign-id');
  }

  return validateCampaignId(campaigns[0]);
}

export function buildLink(baseUrl: string, id: string, key: string, campaignId?: string): string {
  parseLink(`#v1.${id}.${key}`);

  const url = new URL(validateBaseUrl(baseUrl));

  if (campaignId !== undefined) {
    url.searchParams.set('campaign', validateCampaignId(campaignId));
  }

  url.hash = `v1.${id}.${key}`;

  return url.href;
}
