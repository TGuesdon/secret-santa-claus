import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { atomicWrite, readCampaign } from './storage';

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: { archive: { type: 'string', default: 'state/campaign.enc.json' } },
    strict: true,
    allowPositionals: false,
  });
  const key = process.env.SANTA_ARCHIVE_KEY;

  if (!key || process.env.GITHUB_ACTIONS === 'true') {
    throw new Error('Export requires a local archive key.');
  }

  const campaign = await readCampaign(resolve(values.archive), key);
  const relativePath = `.private/exports/${campaign.id}.json`;

  // Plaintext stays in the ignored private directory, never on stdout or in dist.
  await atomicWrite(join(process.cwd(), relativePath), JSON.stringify(campaign, null, 2) + '\n');
  console.log(`Archive exported to ${relativePath}. Keep this file private.`);
}

main().catch(() => {
  console.error('Archive export failed. Check --archive and SANTA_ARCHIVE_KEY in .env.');
  process.exitCode = 1;
});
