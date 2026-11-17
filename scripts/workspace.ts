import { join } from 'node:path';
import { drawPath } from '../src/lib/link';
import { decode } from '../src/lib/crypto';
import type { Campaign } from './campaign';
import { archivePath, assertCurrentBranch, persistGit, saveCampaign } from './storage';

export type Workspace = {
  root: string;
  executor: Campaign['executor'];
  publicPath: string;
  archivePath: string;
  branch?: string;
  campaignId?: string;
};

export function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing configuration: ${name}.`);
  }

  return value;
}

export function createWorkspace(root: string, campaignId?: string): Workspace {
  const executor = process.env.GITHUB_ACTIONS === 'true' ? 'github-actions' : 'local';

  return {
    root,
    executor,
    publicPath: join(root, 'public', drawPath(campaignId)),
    archivePath: campaignId ? archivePath(root, executor, campaignId) : '',
    campaignId,
    branch: process.env.SANTA_DEFAULT_BRANCH,
  };
}

export function validateWorkspace(workspace: Workspace): void {
  if (!workspace.campaignId) {
    throw new Error('Provide a campaign identifier with --id.');
  }

  if (decode(requiredEnv('SANTA_ARCHIVE_KEY')).length !== 32) {
    throw new Error('The archive key must contain 32 random bytes in base64url.');
  }

  if (workspace.executor === 'github-actions') {
    const expectedRef = `refs/heads/${workspace.branch}`;

    if (!workspace.branch || process.env.GITHUB_REF !== expectedRef) {
      throw new Error('Campaign operations must run from the default branch.');
    }

    assertCurrentBranch(workspace.root, workspace.branch);
  }
}

export function checkpointGit(workspace: Workspace): void {
  if (workspace.executor !== 'github-actions') {
    return;
  }

  if (!workspace.branch) {
    throw new Error('Missing default branch configuration.');
  }

  if (!workspace.campaignId) {
    throw new Error('Missing campaign identifier.');
  }

  persistGit(workspace.root, workspace.branch, workspace.campaignId);
}

export async function persistCampaign(workspace: Workspace, campaign: Campaign): Promise<void> {
  if (campaign.executor !== workspace.executor || campaign.id !== workspace.campaignId) {
    throw new Error('This executor cannot modify the saved campaign.');
  }

  await saveCampaign(workspace.archivePath, campaign, requiredEnv('SANTA_ARCHIVE_KEY'));
  checkpointGit(workspace);
}
