import { describe, expect, it } from 'vitest';
import { encode, decode, encrypt, decrypt, randomToken } from '../src/lib/crypto';
import { buildLink, parseLink, campaignFromSearch, drawPath } from '../src/lib/link';
import { createCampaign, validateParticipants } from '../scripts/campaign';
import { sealArchive, openArchive } from '../scripts/archive';

const people = [
  { name: 'Alice', email: 'alice@example.com' },
  { name: 'Bob', email: 'bob@example.com' },
  { name: 'Charlie', email: 'charlie@example.com' },
  { name: 'Diane', email: 'diane@example.com' },
];
const options = {
  id: 'test-2026',
  baseUrl: 'https://example.com/santa/',
  executor: 'local' as const,
};

describe('crypto and links', () => {
  it('round-trips unicode with fresh authenticated IVs', async () => {
    const key = randomToken(32);
    const data = { participantName: 'Éléonore', recipientName: 'Noël' };
    const a = await encrypt(data, key);
    const b = await encrypt(data, key);

    expect(decode(a.iv)).toHaveLength(12);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(await decrypt(a, key)).toEqual(data);
    await expect(decrypt(a, randomToken(32))).rejects.toThrow();
    await expect(decrypt({ ...a, ciphertext: randomToken(40) }, key)).rejects.toThrow();
  });
  it('encodes canonical unpadded base64url and rejects malformed input', () => {
    expect(encode(new Uint8Array([255, 239, 190]))).toBe('_---');
    expect([...decode('_---')]).toEqual([255, 239, 190]);
    for (const bad of ['a', 'a===', '+/', 'AB', 'a b', '']) {
      expect(() => decode(bad)).toThrow();
    }
  });
  it('builds and validates exact personal fragments', () => {
    const id = randomToken(16);
    const key = randomToken(32);
    const url = buildLink(options.baseUrl, id, key);

    expect(url).toBe(`https://example.com/santa/#v1.${id}.${key}`);
    expect(parseLink(new URL(url).hash)).toEqual({ id, key });
    for (const bad of ['#v2.a.b', '#v1.a.b', '#v1', `${new URL(url).hash}.extra`]) {
      expect(() => parseLink(bad)).toThrow();
    }

    expect(() => buildLink('https://example.com/santa/#oops', id, key)).toThrow();
  });
});

describe('campaign', () => {
  it('has one giver/recipient each and isolates individual keys', async () => {
    const { campaign, publicDraw } = await createCampaign(people, options);

    expect(new Set(campaign.records.map((r) => r.recipientName)).size).toBe(4);
    for (const r of campaign.records) {
      expect(r.name).not.toBe(r.recipientName);
      expect(decode(r.key)).toHaveLength(32);
      expect(decode(r.id)).toHaveLength(16);
      expect(await decrypt(publicDraw.entries[r.id], r.key)).toEqual({
        participantName: r.name,
        recipientName: r.recipientName,
      });
    }

    const [a, b] = campaign.records;

    await expect(decrypt(publicDraw.entries[b.id], a.key)).rejects.toThrow();
    const json = JSON.stringify(publicDraw);

    for (const p of people) {
      expect(json).not.toContain(p.name);
      expect(json).not.toContain(p.email);
    }
  });
  it('supports exactly two participants and fresh generation', async () => {
    const a = await createCampaign(people.slice(0, 2), options);
    const b = await createCampaign(people.slice(0, 2), options);

    expect(a.campaign.records.map((r) => r.recipientName)).toEqual(['Bob', 'Alice']);
    expect(a.campaign.records[0].key).not.toBe(b.campaign.records[0].key);
  });
  it.each([
    [],
    [people[0]],
    [people[0], people[0]],
    [{ name: ' ', email: 'a@b.com' }, people[1]],
    [{ name: ' alice ', email: 'x@example.com' }, people[0]],
    [{ name: 'Eve', email: 'ALICE@example.com' }, people[0]],
    [{ name: 'Eve', email: 'bad\r\nBcc: x@example.com' }, people[0]],
    null,
  ])('rejects invalid participants: %j', (input) => {
    expect(() => validateParticipants(input)).toThrow();
  });
  it('rejects invalid campaign identifiers and insecure production base URLs', async () => {
    await expect(createCampaign(people, { ...options, id: '../escape' })).rejects.toThrow();
    await expect(
      createCampaign(people, { ...options, baseUrl: 'http://example.com/' }),
    ).rejects.toThrow();
  });
});

describe('encrypted archive', () => {
  it('recovers the full campaign only with the archive key', async () => {
    const { campaign } = await createCampaign(people, options);
    const key = randomToken(32);
    const sealed = await sealArchive(campaign, key);

    expect(JSON.stringify(sealed)).not.toContain('Alice');
    expect(await openArchive(sealed, key)).toEqual(campaign);
    await expect(openArchive(sealed, randomToken(32))).rejects.toThrow();
    await expect(openArchive({ ...sealed, version: 99 }, key)).rejects.toThrow();
  });
});

describe('campaign selection', () => {
  it('selects campaign paths and keeps demo links queryless', () => {
    expect(drawPath(campaignFromSearch('?campaign=family-2026'))).toBe(
      'campaigns/family-2026/draws.json',
    );
    expect(drawPath(campaignFromSearch(''))).toBe('draws.json');
    const url = buildLink(options.baseUrl, randomToken(16), randomToken(32), 'friends');

    expect(new URL(url).search).toBe('?campaign=friends');
  });

  it.each([
    '?campaign=',
    '?campaign=../escape',
    '?campaign=%2Fescape',
    '?campaign=UPPER',
    '?campaign=a&campaign=b',
    `?campaign=${'a'.repeat(65)}`,
  ])('rejects an invalid selector: %s', (search) => {
    expect(() => campaignFromSearch(search)).toThrow();
  });
});
