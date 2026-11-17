import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, expect, it } from 'vitest';
import {
  atomicWrite,
  withLock,
  saveCampaign,
  readCampaign,
  persistGit,
  assertCurrentBranch,
} from '../scripts/storage';
import { createCampaign } from '../scripts/campaign';
import { randomToken } from '../src/lib/crypto';
import { inspectDist } from '../scripts/dist-guard';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((p) => rm(p, { recursive: true, force: true })));
});
async function directory() {
  const dir = await mkdtemp(join(tmpdir(), 'santa-storage-'));

  roots.push(dir);

  return dir;
}

it('writes atomically and refuses a concurrent operation', async () => {
  const root = await directory();
  const path = join(root, 'private/file');

  await atomicWrite(path, 'first');
  await atomicWrite(path, 'second');
  expect(await readFile(path, 'utf8')).toBe('second');
  await withLock(root, async () => {
    await expect(withLock(root, async () => {})).rejects.toThrow(/lock/);
  });
  expect(await withLock(root, async () => 'released')).toBe('released');
});

it('persists encrypted state to the remote and detects a stale checkout', async () => {
  const root = await directory();
  const remote = join(root, 'remote.git');
  const a = join(root, 'a');
  const b = join(root, 'b');
  const git = (cwd: string, ...args: string[]) =>
    execFileSync('git', args, { cwd, encoding: 'utf8', stdio: 'pipe' });

  git(root, 'init', '--bare', remote);
  git(root, 'clone', remote, a);
  git(a, 'switch', '-c', 'main');
  git(a, 'config', 'user.name', 'Santa Test');
  git(a, 'config', 'user.email', 'test@example.com');
  await writeFile(join(a, 'README.md'), 'test');
  git(a, 'add', '.');
  git(a, 'commit', '-m', 'init');
  git(a, 'push', '-u', 'origin', 'main');
  git(root, 'clone', '--branch', 'main', remote, b);

  const { campaign } = await createCampaign(
    [
      { name: 'Alice', email: 'alice@example.com' },
      { name: 'Bob', email: 'bob@example.com' },
    ],
    { id: 'test', executor: 'github-actions', baseUrl: 'https://example.com/' },
  );
  const key = randomToken(32);
  const archive = join(a, 'state/campaigns/test/campaign.enc.json');

  await atomicWrite(join(a, 'public/campaigns/test/draws.json'), campaign.publicJson);
  await saveCampaign(archive, campaign, key);
  await atomicWrite(join(a, 'public/campaigns/other/draws.json'), campaign.publicJson);
  persistGit(a, 'main', 'test');
  campaign.records[0].status = 'sending';
  await saveCampaign(archive, campaign, key);
  persistGit(a, 'main', 'test');

  expect(git(a, 'status', '--porcelain')).toContain('public/campaigns/other/');
  git(a, 'add', '--', 'public/campaigns/other/draws.json');
  expect(() => persistGit(a, 'main', 'test')).toThrow(/unexpected files/);
  git(a, 'reset', '--', 'public/campaigns/other/draws.json');

  git(b, 'pull', '--ff-only', 'origin', 'main');
  expect(
    (await readCampaign(join(b, 'state/campaigns/test/campaign.enc.json'), key)).records[0].status,
  ).toBe('sending');
  await writeFile(join(b, 'README.md'), 'changed elsewhere');
  git(
    b,
    '-c',
    'user.name=Test',
    '-c',
    'user.email=test@example.com',
    'commit',
    '-am',
    'remote change',
  );
  git(b, 'push', 'origin', 'main');
  expect(() => assertCurrentBranch(a, 'main')).toThrow(/remote branch/);
});

it('rejects private files, modified public data and configured secrets in the build', async () => {
  const root = await directory();
  const json = '{"version":1,"entries":{}}\n';

  await mkdir(join(root, 'assets'));
  await writeFile(join(root, 'index.html'), '<html></html>');
  await writeFile(join(root, 'draws.json'), json);
  await writeFile(join(root, 'assets/index-abc.js'), 'public code');
  await expect(inspectDist(root, { 'draws.json': json }, {})).resolves.toBeUndefined();

  await writeFile(join(root, 'archive.enc.json'), 'secret');
  await expect(inspectDist(root, { 'draws.json': json }, {})).rejects.toThrow();
  await rm(join(root, 'archive.enc.json'));
  await writeFile(join(root, 'jingle_bell.mp3'), Buffer.from([0x49, 0x44, 0x33]));
  await writeFile(join(root, 'intro_loop.mp3'), Buffer.from([0x49, 0x44, 0x33]));
  await writeFile(join(root, 'assets/christmas-friends-abc.webp'), 'public illustration');
  await writeFile(join(root, 'assets/fredoka-abc.ttf'), 'public font');
  await writeFile(join(root, 'assets/fredoka-abc.woff2'), 'compressed public font');
  await expect(inspectDist(root, { 'draws.json': json }, {})).resolves.toBeUndefined();

  await writeFile(join(root, 'assets/index-abc.js'), 'leaked-app-password');
  await expect(
    inspectDist(
      root,
      { 'draws.json': json },
      { GOOGLE_APPLICATION_PASSWORD: 'leaked-app-password' },
    ),
  ).rejects.toThrow();
  await expect(
    inspectDist(
      root,
      { 'draws.json': json },
      { GOOGLE_APPLICATION_PASSWORD: 'leaked app password' },
    ),
  ).resolves.toBeUndefined();
  await writeFile(join(root, 'assets/index-abc.js'), 'leakedapppassword');
  await expect(
    inspectDist(
      root,
      { 'draws.json': json },
      { GOOGLE_APPLICATION_PASSWORD: 'leaked app password' },
    ),
  ).rejects.toThrow();
  await writeFile(join(root, 'assets/index-abc.js'), 'public code');
  await writeFile(join(root, 'draws.json'), '{}');
  await expect(inspectDist(root, { 'draws.json': json }, {})).rejects.toThrow();
});

it('verifies every campaign draw and rejects missing, changed or unexpected campaign files', async () => {
  const root = await directory();
  const json = '{"version":1,"entries":{}}\n';
  const expected = {
    'draws.json': json,
    'campaigns/family/draws.json': json,
    'campaigns/friends/draws.json': json,
  };

  for (const [path, contents] of Object.entries(expected)) {
    await atomicWrite(join(root, path), contents);
  }

  await expect(inspectDist(root, expected, {})).resolves.toBeUndefined();
  await rm(join(root, 'campaigns/friends/draws.json'));
  await expect(inspectDist(root, expected, {})).rejects.toThrow();
  await atomicWrite(join(root, 'campaigns/friends/draws.json'), '{}');
  await expect(inspectDist(root, expected, {})).rejects.toThrow();
  await atomicWrite(join(root, 'campaigns/friends/draws.json'), json);
  await atomicWrite(join(root, 'campaigns/friends/links.json'), 'private');
  await expect(inspectDist(root, expected, {})).rejects.toThrow();
  await rm(join(root, 'campaigns/friends/links.json'));
  await atomicWrite(join(root, 'campaigns/extra/draws.json'), json);
  await expect(inspectDist(root, expected, {})).rejects.toThrow();
});

it('allows the config entry while rejecting extra files and secrets in that directory', async () => {
  const root = await directory();
  const json = '{"version":1,"entries":{}}\n';

  await atomicWrite(join(root, 'draws.json'), json);
  await atomicWrite(join(root, 'config/index.html'), '<title>Secret Santa</title>');
  await expect(inspectDist(root, { 'draws.json': json }, {})).resolves.toBeUndefined();
  await atomicWrite(join(root, 'config/participants.json'), 'private');
  await expect(inspectDist(root, { 'draws.json': json }, {})).rejects.toThrow();
  await rm(join(root, 'config/participants.json'));
  await atomicWrite(join(root, 'config/index.html'), 'private-archive-key');
  await expect(
    inspectDist(root, { 'draws.json': json }, { SANTA_ARCHIVE_KEY: 'private-archive-key' }),
  ).rejects.toThrow(/Private/);
});
