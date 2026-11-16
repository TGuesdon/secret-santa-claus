import { validateCampaign } from './archive';
import { hashText, type Campaign } from './campaign';
import { composeMail, validateSender, type Sender } from './mail';

type DeliveryOptions = {
  sender: Sender;
  executor: Campaign['executor'];
  live?: boolean;
  confirm?: string;
  persist: (campaign: Campaign) => Promise<void>;
  send?: (mime: Buffer, recipient: string) => Promise<string>;
  fetcher?: typeof fetch;
};

export async function verifyPublished(
  campaign: Campaign,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  try {
    const response = await fetcher(new URL('draws.json', campaign.baseUrl), {
      cache: 'no-store',
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok || hashText(await response.text()) !== campaign.publicHash) {
      throw new Error();
    }
  } catch {
    throw new Error('The published draw does not match this campaign. Deploy before sending.');
  }
}

export async function deliver(campaign: Campaign, options: DeliveryOptions) {
  validateCampaign(campaign);
  validateSender(options.sender);

  if (options.live) {
    if (
      campaign.mode !== 'production' ||
      campaign.executor !== options.executor ||
      options.confirm !== campaign.id ||
      !options.send
    ) {
      throw new Error('Delivery refused: check the campaign, executor and confirmation.');
    }

    if (campaign.records.some((r) => r.status === 'sending')) {
      throw new Error('An uncertain delivery must be resolved before resuming.');
    }

    await verifyPublished(campaign, options.fetcher);
  }

  const result = { prepared: 0, sent: 0, skipped: 0 };

  for (const record of campaign.records) {
    if (record.status === 'sent') {
      result.skipped++;
      continue;
    }

    const mime = await composeMail(record, options.sender, campaign.id);

    result.prepared++;
    if (!options.live) {
      continue;
    }

    // Persist delivery intent before making any request to Gmail.
    record.status = 'sending';
    await options.persist(campaign);

    const messageId = await options.send!(mime, record.email);

    if (!messageId) {
      throw new Error('Gmail did not confirm delivery.');
    }

    record.messageId = messageId;
    record.status = 'sent';
    await options.persist(campaign);
    result.sent++;
  }

  return result;
}
