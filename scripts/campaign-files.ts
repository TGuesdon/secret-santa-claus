import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import QRCode from 'qrcode';
import { decrypt } from '../src/lib/crypto';
import { isObject, validateDraw } from '../src/lib/draw-loader';
import { hashText, type Campaign, type DemoIdentity } from './campaign';
import { archivePath, atomicWrite, exists, readCampaign } from './storage';
import { requiredEnv, type Workspace } from './workspace';

export async function readDemoFixtures(workspace: Workspace): Promise<DemoIdentity[]> {
  const fixturePath = join(workspace.root, 'fixtures/demo.json');

  return JSON.parse(await readFile(fixturePath, 'utf8'));
}

export async function publicIsDemo(workspace: Workspace): Promise<boolean> {
  if (!(await exists(workspace.publicPath))) {
    return true;
  }

  try {
    const draw = validateDraw(JSON.parse(await readFile(workspace.publicPath, 'utf8')));
    const fixtures = await readDemoFixtures(workspace);

    if (Object.keys(draw.entries).length !== fixtures.length) {
      return false;
    }

    for (const fixture of fixtures) {
      const result = await decrypt(draw.entries[fixture.id], fixture.key);
      const validNames =
        isObject(result) &&
        result.participantName === fixture.name &&
        result.recipientName === fixture.recipientName;

      if (!validNames) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

export async function exportPrivateFiles(workspace: Workspace, campaign: Campaign): Promise<void> {
  const folder = campaign.mode === 'demo' ? 'demo' : 'production';
  const directory = join(workspace.root, '.private', folder);
  const qrDirectory = join(directory, 'qr');

  await mkdir(qrDirectory, { recursive: true });
  await atomicWrite(
    join(directory, 'links.json'),
    JSON.stringify(campaign.records, null, 2) + '\n',
  );

  for (const [index, record] of campaign.records.entries()) {
    const png = await QRCode.toBuffer(record.url);

    await writeFile(join(qrDirectory, `${index + 1}.png`), png, { mode: 0o600 });
  }
}

export async function loadSavedCampaign(
  workspace: Workspace,
  expectedId?: string,
): Promise<Campaign> {
  let selectedPath = workspace.archivePath;

  // Local inspection of an Actions archive is allowed; delivery still checks its executor.
  if (!(await exists(selectedPath)) && workspace.executor === 'local') {
    selectedPath = archivePath(workspace.root, 'github-actions');
  }

  const campaign = await readCampaign(selectedPath, requiredEnv('SANTA_ARCHIVE_KEY'));

  if (expectedId && expectedId !== campaign.id) {
    throw new Error('The campaign identifier does not match the saved archive.');
  }

  await verifyCampaignFiles(workspace, campaign);

  return campaign;
}

export async function verifyCampaignFiles(workspace: Workspace, campaign: Campaign): Promise<void> {
  const publicJson = await readFile(workspace.publicPath, 'utf8');

  if (hashText(publicJson) !== campaign.publicHash) {
    throw new Error('The public draw differs from the saved archive.');
  }

  const draw = validateDraw(JSON.parse(publicJson));

  for (const record of campaign.records) {
    const result = await decrypt(draw.entries[record.id], record.key);
    const validNames =
      isObject(result) &&
      result.participantName === record.name &&
      result.recipientName === record.recipientName;

    if (!validNames) {
      throw new Error('An encrypted assignment does not match the archive.');
    }
  }
}
