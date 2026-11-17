import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { validateCampaignId } from '../src/lib/link';
import { archivePath, atomicWrite, readCampaign } from './storage';

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: { archive: { type: 'string' }, id: { type: 'string' } },
    strict: true,
    allowPositionals: false,
  });
  const key = process.env.SANTA_ARCHIVE_KEY;

  if (!key || process.env.GITHUB_ACTIONS === 'true') {
    throw new Error('Export requires a local archive key.');
  }

  if (Boolean(values.id) === Boolean(values.archive)) {
    throw new Error('Provide either --id or --archive.');
  }

  const selectedPath = values.archive
    ? resolve(values.archive)
    : archivePath(process.cwd(), 'github-actions', validateCampaignId(values.id!));
  const campaign = await readCampaign(selectedPath, key);

  if (values.id && values.id !== campaign.id) {
    throw new Error('The campaign identifier does not match the saved archive.');
  }

  const relativePath = `.private/campaigns/${campaign.id}/export.json`;

  // Plaintext stays in the ignored private directory, never on stdout or in dist.
  await atomicWrite(join(process.cwd(), relativePath), JSON.stringify(campaign, null, 2) + '\n');
  console.log(`Archive exported to ${relativePath}. Keep this file private.`);
}

main().catch(() => {
  console.error('Archive export failed. Check --id or --archive and SANTA_ARCHIVE_KEY in .env.');
  process.exitCode = 1;
});
