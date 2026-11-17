import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { isObject } from '../src/lib/draw-loader';
import { validateBaseUrl } from '../src/lib/link';
import { createCampaign, hashText, type Campaign } from './campaign';
import {
  exportPrivateFiles,
  loadSavedCampaign,
  publicIsDemo,
  readDemoFixtures,
} from './campaign-files';
import { deliver, verifyPublished } from './delivery';
import { composeMail, gmailTransport, type Sender } from './mail';
import { archivePath, atomicWrite, exists, readCampaign, saveCampaign } from './storage';
import { checkpointGit, persistCampaign, requiredEnv, type Workspace } from './workspace';

export type CommandOptions = {
  id?: string;
  participantFile?: string;
  baseUrl?: string;
  live: boolean;
  confirmation?: string;
  published: boolean;
  recordId?: string;
  status?: string;
  messageId?: string;
};

export async function generateDemo(workspace: Workspace, options: CommandOptions): Promise<void> {
  if (workspace.executor !== 'local') {
    throw new Error('Demo generation cannot replace a production campaign.');
  }

  if (!(await publicIsDemo(workspace))) {
    throw new Error('Demo generation cannot replace production public data.');
  }

  const fixtures = await readDemoFixtures(workspace);
  const baseUrl = options.baseUrl ?? process.env.PUBLIC_BASE_URL ?? 'http://localhost:5173/';
  const { campaign } = await createCampaign(
    fixtures,
    { id: 'demo', executor: 'local', baseUrl },
    fixtures,
  );

  await atomicWrite(workspace.publicPath, campaign.publicJson);
  await exportPrivateFiles(workspace, campaign);

  console.log('Demo ready: .private/demo/links.json and .private/demo/qr/.');
}

async function resumePreparation(workspace: Workspace, id: string, baseUrl: string): Promise<void> {
  const campaign = await readCampaign(workspace.archivePath, requiredEnv('SANTA_ARCHIVE_KEY'));
  const matchingCampaign =
    campaign.id === id && campaign.baseUrl === baseUrl && campaign.executor === workspace.executor;

  if (!matchingCampaign) {
    throw new Error('A different campaign already exists. Overwriting it is forbidden.');
  }

  if (await exists(workspace.publicPath)) {
    const publicHash = hashText(await readFile(workspace.publicPath, 'utf8'));

    if (publicHash !== campaign.publicHash) {
      throw new Error('The public draw was modified. Restore it before resuming.');
    }
  }

  // The archive retains the exact public bytes, even if the previous write was interrupted.
  await atomicWrite(workspace.publicPath, campaign.publicJson);
  checkpointGit(workspace);

  if (workspace.executor === 'local') {
    await exportPrivateFiles(workspace, campaign);
  }

  console.log('Resumed the existing campaign without generating new assignments.');
}

export async function prepareCampaign(
  workspace: Workspace,
  options: CommandOptions,
): Promise<void> {
  if (!options.id) {
    throw new Error('Provide a campaign identifier with --id.');
  }

  const baseUrl = validateBaseUrl(options.baseUrl ?? requiredEnv('PUBLIC_BASE_URL'));

  const otherExecutor = workspace.executor === 'local' ? 'github-actions' : 'local';
  const otherArchiveExists = await exists(archivePath(workspace.root, otherExecutor, options.id));

  if (otherArchiveExists) {
    throw new Error('Another executor already owns this campaign.');
  }

  if (await exists(workspace.archivePath)) {
    await resumePreparation(workspace, options.id, baseUrl);

    return;
  }

  if (await exists(workspace.publicPath)) {
    throw new Error('Another campaign already owns the public draw.');
  }

  const participantJson = options.participantFile
    ? await readFile(options.participantFile, 'utf8')
    : requiredEnv('SANTA_PARTICIPANTS_JSON');
  const participantInput: unknown = JSON.parse(participantJson);
  let participants = participantInput;

  if (!options.participantFile) {
    if (!isObject(participantInput) || !Object.hasOwn(participantInput, options.id)) {
      throw new Error('The participant map has no entry for this campaign.');
    }

    participants = participantInput[options.id];
  }

  const { campaign } = await createCampaign(participants, {
    id: options.id,
    baseUrl,
    executor: workspace.executor,
  });

  // Save recovery data first. Emails are never sent during preparation.
  await saveCampaign(workspace.archivePath, campaign, requiredEnv('SANTA_ARCHIVE_KEY'));
  await atomicWrite(workspace.publicPath, campaign.publicJson);
  checkpointGit(workspace);

  if (workspace.executor === 'local') {
    await exportPrivateFiles(workspace, campaign);
  }

  console.log('Campaign prepared and saved. No emails sent.');
}

export async function checkCampaign(workspace: Workspace, options: CommandOptions): Promise<void> {
  const campaign = await loadSavedCampaign(workspace, options.id);

  if (options.published) {
    await verifyPublished(campaign);
  }

  const uncertainCount = campaign.records.filter((record) => record.status === 'sending').length;

  console.log(
    `Campaign verified: ${campaign.records.length} participants, ${uncertainCount} uncertain deliveries.`,
  );
}

export async function resolveDelivery(
  workspace: Workspace,
  options: CommandOptions,
): Promise<void> {
  const campaign = await loadSavedCampaign(workspace, options.id);

  if (campaign.executor !== workspace.executor || options.confirmation !== campaign.id) {
    throw new Error('Resolution requires the original executor and exact campaign confirmation.');
  }

  if (!options.recordId || (options.status !== 'pending' && options.status !== 'sent')) {
    throw new Error('Provide --record and --status pending|sent.');
  }

  const record = campaign.records.find((entry) => entry.id === options.recordId);

  if (!record || record.status !== 'sending') {
    throw new Error('Only an uncertain delivery can be resolved.');
  }

  if (options.status === 'sent' && !options.messageId) {
    throw new Error('Provide the confirmed email Message-ID with --message-id.');
  }

  record.status = options.status;

  if (record.status === 'sent') {
    record.messageId = options.messageId;
  } else {
    delete record.messageId;
  }

  await persistCampaign(workspace, campaign);
  console.log('Uncertain delivery resolved. No email sent.');
}

async function exportEmailPreviews(
  workspace: Workspace,
  campaign: Campaign,
  sender: Sender,
): Promise<void> {
  const directory = join(workspace.root, '.private/campaigns', campaign.id, 'emails');

  await mkdir(directory, { recursive: true });

  for (const [index, record] of campaign.records.entries()) {
    const mime = await composeMail(record, sender, campaign.id);

    await writeFile(join(directory, `${index + 1}.eml`), mime, { mode: 0o600 });
  }
}

export async function sendCampaignMail(
  workspace: Workspace,
  options: CommandOptions,
): Promise<void> {
  const campaign = await loadSavedCampaign(workspace, options.id);
  const sender = {
    email: requiredEnv('SANTA_SENDER_EMAIL'),
    name: process.env.SANTA_SENDER_NAME?.trim() || 'Santa Claus 🎅',
  };

  // Opaque IDs are public; personal names, addresses and URLs must stay out of logs.
  for (const record of campaign.records) {
    if (record.status === 'sending') {
      console.log(
        `Uncertain delivery: record ${record.id}; Message-ID <${record.id}.${campaign.id}@secret-santa.invalid>.`,
      );
    }
  }

  const result = await deliver(campaign, {
    sender,
    executor: workspace.executor,
    live: options.live,
    confirm: options.confirmation,
    persist: (updatedCampaign) => persistCampaign(workspace, updatedCampaign),
    send: options.live ? gmailTransport() : undefined,
  });

  if (!options.live && workspace.executor === 'local') {
    await exportEmailPreviews(workspace, campaign, sender);
  }

  const label = options.live ? 'Delivery' : 'Dry-run';

  console.log(
    `${label}: ${result.prepared} prepared, ${result.sent} sent, ${result.skipped} already sent.`,
  );
}
