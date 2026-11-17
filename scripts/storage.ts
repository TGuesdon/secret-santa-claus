import { mkdir, open, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { drawPath, validateCampaignId } from '../src/lib/link';
import { randomToken } from '../src/lib/crypto';
import { openArchive, sealArchive } from './archive';
import type { Campaign } from './campaign';

export async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);

    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

export async function atomicWrite(path: string, value: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${randomToken(8)}.tmp`;

  try {
    await writeFile(temporary, value, { mode: 0o600, flag: 'wx' });
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true });
  }
}

export async function withLock<T>(root: string, action: () => Promise<T>): Promise<T> {
  const path = join(root, '.private/operation.lock');

  await mkdir(dirname(path), { recursive: true });
  let handle;

  try {
    handle = await open(path, 'wx', 0o600);
  } catch {
    throw new Error(
      'An operation is already running or its lock remains. Check processes before removing .private/operation.lock.',
    );
  }

  try {
    await handle.writeFile(`${process.pid}\n`);

    return await action();
  } finally {
    await handle.close();
    await rm(path, { force: true });
  }
}

export function archivePath(root: string, executor: Campaign['executor'], id: string): string {
  validateCampaignId(id);
  const directory = executor === 'github-actions' ? 'state' : '.private';

  return join(root, directory, 'campaigns', id, 'campaign.enc.json');
}

export async function readCampaign(path: string, key: string): Promise<Campaign> {
  return openArchive(JSON.parse(await readFile(path, 'utf8')), key);
}

export async function saveCampaign(path: string, campaign: Campaign, key: string): Promise<void> {
  await atomicWrite(path, JSON.stringify(await sealArchive(campaign, key), null, 2) + '\n');
}

function git(root: string, args: string[]): string {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

export function assertCurrentBranch(root: string, branch: string): void {
  if (!/^[A-Za-z0-9._/-]+$/.test(branch) || branch.startsWith('-')) {
    throw new Error('Invalid branch name.');
  }

  git(root, ['fetch', 'origin', branch]);

  if (
    git(root, ['branch', '--show-current']) !== branch ||
    git(root, ['rev-parse', 'HEAD']) !== git(root, ['rev-parse', `origin/${branch}`])
  ) {
    throw new Error(
      'The remote branch changed or the checkout is incorrect. Restart from the latest version.',
    );
  }
}

export function persistGit(root: string, branch: string, id: string): void {
  assertCurrentBranch(root, branch);

  const allowed = [
    `public/${drawPath(id)}`,
    `state/campaigns/${validateCampaignId(id)}/campaign.enc.json`,
  ];
  const staged = git(root, ['diff', '--cached', '--name-only']).split('\n').filter(Boolean);

  if (staged.some((path) => !allowed.includes(path))) {
    throw new Error('The Git index contains unexpected files.');
  }

  git(root, ['add', '--', ...allowed]);

  if (!git(root, ['diff', '--cached', '--name-only'])) {
    return;
  }

  git(root, [
    '-c',
    'user.name=github-actions[bot]',
    '-c',
    'user.email=41898282+github-actions[bot]@users.noreply.github.com',
    'commit',
    '-m',
    'chore: persist encrypted Secret Santa state',
  ]);

  // A rejected push must stop delivery; never force over another writer's state.
  git(root, ['push', 'origin', `HEAD:refs/heads/${branch}`]);
}
