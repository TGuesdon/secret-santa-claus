import { expect, it } from 'vitest';
import { simpleParser } from 'mailparser';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';
import { createCampaign, serializeDraw, type Campaign } from '../scripts/campaign';
import { composeMail } from '../scripts/mail';
import { deliver, verifyPublished } from '../scripts/delivery';

const sender = { email: 'santa@example.com', name: 'Santa Claus 🎅' };

async function fixture() {
  return createCampaign(
    [
      { name: 'Alice <3', email: 'alice@example.com' },
      { name: 'Bob', email: 'bob@example.com' },
    ],
    { id: 'test', executor: 'local', baseUrl: 'https://example.com/santa/' },
  );
}

it('builds a Unicode multipart mail with matching link, text and CID QR', async () => {
  const { campaign } = await fixture();
  const mime = await composeMail(campaign.records[0], sender, campaign.id);
  const parsed = await simpleParser(mime, { skipImageLinks: true });

  expect(parsed.from?.value[0]).toMatchObject({ name: sender.name, address: sender.email });
  expect(parsed.to).toMatchObject({ value: [{ address: 'alice@example.com', name: 'Alice <3' }] });
  expect(parsed.text).toContain(campaign.records[0].url);
  expect(parsed.html).toContain('Alice &lt;3');
  expect(parsed.html).toContain('cid:santa-qr');
  expect(parsed.subject).toBe('Secret Santa: test');
  expect(parsed.text).toContain('Ton tirage Secret Santa est prêt');
  expect(parsed.text).toContain('Garde ce lien secret');
  expect(parsed.html).toContain('Révéler mon tirage');
  expect(parsed.html).toContain('lang="fr"');
  expect(parsed.attachments).toHaveLength(1);
  const png = PNG.sync.read(parsed.attachments[0].content);
  const qr = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);

  expect(qr?.data).toBe(campaign.records[0].url);
  expect(parsed.messageId).toBe(`<${campaign.records[0].id}.test@secret-santa.invalid>`);
});

it('rejects header injection', async () => {
  const { campaign } = await fixture();

  await expect(
    composeMail(campaign.records[0], { ...sender, name: 'X\r\nBcc: x@example.com' }, campaign.id),
  ).rejects.toThrow();
});

it('dry-run prepares all emails without sending or modifying the campaign', async () => {
  const { campaign } = await fixture();
  const original = structuredClone(campaign);
  const result = await deliver(campaign, {
    sender,
    executor: 'local',
    persist: async () => {
      throw new Error('unexpected write');
    },
    send: async () => {
      throw new Error('unexpected send');
    },
  });

  expect(result).toEqual({ prepared: 2, sent: 0, skipped: 0 });
  expect(campaign).toEqual(original);
});

it('persists sending before Gmail, sent afterwards, and skips already sent records on resume', async () => {
  const { campaign, publicDraw } = await fixture();
  const saved: Campaign[] = [];
  const options = {
    sender,
    executor: 'local' as const,
    live: true,
    confirm: 'test',
    fetcher: async () => new Response(serializeDraw(publicDraw)),
    persist: async (c: Campaign) => {
      saved.push(structuredClone(c));
    },
    send: async () => {
      expect(saved.at(-1)?.records.some((r) => r.status === 'sending')).toBe(true);

      return `gmail-${saved.length}`;
    },
  };

  expect(await deliver(campaign, options)).toEqual({ prepared: 2, sent: 2, skipped: 0 });
  expect(saved.map((c) => c.records.map((r) => r.status))).toEqual([
    ['sending', 'pending'],
    ['sent', 'pending'],
    ['sent', 'sending'],
    ['sent', 'sent'],
  ]);
  expect(
    await deliver(campaign, {
      ...options,
      send: async () => {
        throw new Error('duplicate');
      },
    }),
  ).toEqual({ prepared: 0, sent: 0, skipped: 2 });
});

it('leaves an uncertain send durable and prevents automatic retries', async () => {
  const { campaign, publicDraw } = await fixture();
  let durable: Campaign | undefined;
  const options = {
    sender,
    executor: 'local' as const,
    live: true,
    confirm: 'test',
    fetcher: async () => new Response(serializeDraw(publicDraw)),
    persist: async (c: Campaign) => {
      durable = structuredClone(c);
    },
    send: async (): Promise<string> => {
      throw new Error('Gmail accepted but connection lost');
    },
  };

  await expect(deliver(campaign, options)).rejects.toThrow();
  expect(durable!.records[0].status).toBe('sending');
  await expect(deliver(durable!, { ...options, send: async () => 'duplicate' })).rejects.toThrow(
    /uncertain/,
  );
});

it('does not call Gmail if persisting the intent fails', async () => {
  const { campaign, publicDraw } = await fixture();
  let calls = 0;

  await expect(
    deliver(campaign, {
      sender,
      executor: 'local',
      live: true,
      confirm: 'test',
      fetcher: async () => new Response(serializeDraw(publicDraw)),
      persist: async () => {
        throw new Error('disk full');
      },
      send: async () => {
        calls++;

        return 'bad';
      },
    }),
  ).rejects.toThrow();
  expect(calls).toBe(0);
});

it('leaves the durable intent uncertain if recording Gmail success fails', async () => {
  const { campaign, publicDraw } = await fixture();
  let durable: Campaign | undefined;
  let saves = 0;
  let calls = 0;

  await expect(
    deliver(campaign, {
      sender,
      executor: 'local',
      live: true,
      confirm: 'test',
      fetcher: async () => new Response(serializeDraw(publicDraw)),
      persist: async (c) => {
        if (++saves === 2) {
          throw new Error('push conflict');
        }

        durable = structuredClone(c);
      },
      send: async () => {
        calls++;

        return 'gmail-1';
      },
    }),
  ).rejects.toThrow();
  expect(calls).toBe(1);
  expect(durable!.records[0].status).toBe('sending');
  expect(durable!.records[1].status).toBe('pending');
});

it('blocks unconfirmed sends, demo, executor mismatch and unpublished data before any write or mail', async () => {
  for (const change of ['confirmation', 'demo', 'executor', 'hash', 'http-error']) {
    const { campaign, publicDraw } = await fixture();

    if (change === 'demo') {
      campaign.mode = 'demo';
    }

    if (change === 'executor') {
      campaign.executor = 'github-actions';
    }

    await expect(
      deliver(campaign, {
        sender,
        executor: 'local',
        live: true,
        confirm: change === 'confirmation' ? 'wrong' : 'test',
        fetcher: async () =>
          new Response(change === 'hash' ? '{}' : serializeDraw(publicDraw), {
            status: change === 'http-error' ? 404 : 200,
          }),
        persist: async () => {
          throw new Error('unexpected write');
        },
        send: async () => {
          throw new Error('unexpected send');
        },
      }),
    ).rejects.toThrow();
    expect(campaign.records.every((r) => r.status === 'pending')).toBe(true);
  }
});

it('verifies the selected campaign URL and refuses another campaign draw', async () => {
  const { campaign } = await fixture();
  const { campaign: other } = await createCampaign(
    [
      { name: 'Charlie', email: 'charlie@example.com' },
      { name: 'Diane', email: 'diane@example.com' },
    ],
    { id: 'other', executor: 'local', baseUrl: campaign.baseUrl },
  );
  const requested: string[] = [];

  await verifyPublished(campaign, async (url) => {
    requested.push(String(url));

    return new Response(campaign.publicJson);
  });
  expect(requested).toEqual(['https://example.com/santa/campaigns/test/draws.json']);
  await expect(
    verifyPublished(campaign, async () => new Response(other.publicJson)),
  ).rejects.toThrow(/published draw/);
});
