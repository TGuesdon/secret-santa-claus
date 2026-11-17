import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { afterEach, expect, it } from 'vitest';
import { readCampaign, saveCampaign } from '../scripts/storage';
import { randomToken } from '../src/lib/crypto';
import { simpleParser } from 'mailparser';

const exec = promisify(execFile);
const roots: string[] = [];
const cli = resolve('scripts/cli.ts');
const tsx = pathToFileURL(resolve('node_modules/tsx/dist/loader.mjs')).href;

afterEach(async () => {
  await Promise.all(roots.splice(0).map((p) => rm(p, { recursive: true, force: true })));
});
async function setup() {
  const cwd = await mkdtemp(join(tmpdir(), 'santa-test-'));

  roots.push(cwd);
  await mkdir(join(cwd, 'fixtures'));
  await writeFile(join(cwd, 'fixtures/demo.json'), await readFile('fixtures/demo.json'));
  await writeFile(
    join(cwd, 'participants.json'),
    JSON.stringify([
      { name: 'Alice', email: 'alice@example.com' },
      { name: 'Bob', email: 'bob@example.com' },
    ]),
  );
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    GITHUB_ACTIONS: '',
    SANTA_ARCHIVE_KEY: randomToken(32),
    PUBLIC_BASE_URL: 'https://example.com/santa/',
    SANTA_SENDER_EMAIL: 'santa@example.com',
    SANTA_SENDER_NAME: 'Santa Claus 🎅',
  };
  const run = (...args: string[]) =>
    exec(process.execPath, ['--import', tsx, cli, ...args], { cwd, env });

  return { cwd, env, run };
}

it('exports a decrypted archive privately without changing campaign files or logging links', async () => {
  const { cwd, env, run } = await setup();

  await run('prepare', '--id', 'export-test', '--participants', 'participants.json');
  const archivePath = join(cwd, '.private/campaigns/export-test/campaign.enc.json');
  const archiveBefore = await readFile(archivePath, 'utf8');
  const drawBefore = await readFile(join(cwd, 'public/campaigns/export-test/draws.json'), 'utf8');
  const exportScript = resolve('scripts/export-archive.ts');
  const exportArgs = ['--import', tsx, exportScript, '--archive', archivePath];
  const output = await exec(process.execPath, exportArgs, { cwd, env });
  const campaign = JSON.parse(
    await readFile(join(cwd, '.private/campaigns/export-test/export.json'), 'utf8'),
  );

  expect(campaign.id).toBe('export-test');
  expect(campaign.records).toHaveLength(2);
  expect(campaign.records[0].url).toContain('#v1.');
  expect(output.stdout).not.toContain(campaign.records[0].key);
  expect(output.stdout).not.toContain(campaign.records[0].email);
  expect(await readFile(archivePath, 'utf8')).toBe(archiveBefore);
  expect(await readFile(join(cwd, 'public/campaigns/export-test/draws.json'), 'utf8')).toBe(
    drawBefore,
  );

  await expect(
    exec(process.execPath, exportArgs, {
      cwd,
      env: { ...env, SANTA_ARCHIVE_KEY: randomToken(32) },
    }),
  ).rejects.toMatchObject({ stderr: expect.stringContaining('Archive export failed.') });
  expect(
    JSON.parse(await readFile(join(cwd, '.private/campaigns/export-test/export.json'), 'utf8')),
  ).toEqual(campaign);
});

it('generates the root demo without changing production campaigns', async () => {
  const { cwd, run } = await setup();

  await run('demo');
  const demo = JSON.parse(await readFile(join(cwd, '.private/demo/links.json'), 'utf8'));

  expect(demo).toHaveLength(4);
  expect(await readFile(join(cwd, '.private/demo/qr/1.png'))).toBeInstanceOf(Buffer);
  await run('prepare', '--id', 'test', '--participants', 'participants.json');
  const before = await readFile(join(cwd, 'public/campaigns/test/draws.json'), 'utf8');

  await run('demo');
  expect(await readFile(join(cwd, 'public/campaigns/test/draws.json'), 'utf8')).toBe(before);
});

it('resumes preparation without redrawing and dry-runs without Gmail credentials', async () => {
  const { cwd, run } = await setup();

  await run('prepare', '--id', 'test', '--participants', 'participants.json');
  const before = await readFile(join(cwd, 'public/campaigns/test/draws.json'), 'utf8');

  await run('prepare', '--id', 'test');
  expect(await readFile(join(cwd, 'public/campaigns/test/draws.json'), 'utf8')).toBe(before);
  const out = await run('mail', '--id', 'test');

  expect(out.stdout).toContain('Dry-run');
  expect(out.stdout).not.toContain('alice@example.com');
  await run('prepare', '--id', 'different', '--participants', 'participants.json');
  await run('check', '--id', 'different');
  const other = await readFile(join(cwd, 'public/campaigns/different/draws.json'), 'utf8');

  expect(other).not.toBe(before);
  await run('mail', '--id', 'different');
  const firstMail = await simpleParser(
    await readFile(join(cwd, '.private/campaigns/test/emails/1.eml')),
  );

  expect(firstMail.text).toContain('?campaign=test');
  const otherMail = await simpleParser(
    await readFile(join(cwd, '.private/campaigns/different/emails/1.eml')),
  );

  expect(otherMail.text).toContain('?campaign=different');
  expect(await readFile(join(cwd, 'public/campaigns/test/draws.json'), 'utf8')).toBe(before);
});

it('fails closed on unknown arguments and altered public files', async () => {
  const { cwd, run } = await setup();

  await expect(
    run('prepare', '--id', 'test', '--particpants', 'participants.json'),
  ).rejects.toThrow();
  await run('prepare', '--id', 'test', '--participants', 'participants.json');
  await writeFile(join(cwd, 'public/campaigns/test/draws.json'), '{}');
  await expect(run('check', '--id', 'test')).rejects.toThrow();
});

it('uses the default sender when the optional Actions variable is empty', async () => {
  const { cwd, env, run } = await setup();

  env.SANTA_SENDER_NAME = '';

  await run('prepare', '--id', 'test', '--participants', 'participants.json');
  await run('mail', '--id', 'test');

  const preview = await readFile(join(cwd, '.private/campaigns/test/emails/1.eml'));
  const message = await simpleParser(preview);

  expect(message.from?.value[0].name).toBe('Santa Claus 🎅');
});

it('selects each participant list from the secret map and fails closed on missing IDs', async () => {
  const { cwd, env, run } = await setup();
  const participants = JSON.parse(await readFile(join(cwd, 'participants.json'), 'utf8'));

  env.SANTA_PARTICIPANTS_JSON = JSON.stringify({
    family: participants,
    friends: [
      { name: 'Charlie', email: 'charlie@example.com' },
      { name: 'Diane', email: 'diane@example.com' },
    ],
  });

  await run('prepare', '--id', 'family');
  await run('prepare', '--id', 'friends');
  const family = JSON.parse(
    await readFile(join(cwd, '.private/campaigns/family/links.json'), 'utf8'),
  );
  const friends = JSON.parse(
    await readFile(join(cwd, '.private/campaigns/friends/links.json'), 'utf8'),
  );

  expect(family.map((record: { name: string }) => record.name)).toEqual(['Alice', 'Bob']);
  expect(friends.map((record: { name: string }) => record.name)).toEqual(['Charlie', 'Diane']);
  await expect(run('prepare', '--id', 'missing')).rejects.toThrow();
  await expect(run('prepare', '--id', '../escape')).rejects.toThrow();
  await expect(run('mail')).rejects.toThrow();
  await expect(run('check')).rejects.toThrow();
  env.SANTA_PARTICIPANTS_JSON = JSON.stringify(participants);
  await expect(run('prepare', '--id', 'array')).rejects.toThrow();
});

it('does not redraw when public campaign data exists without its archive', async () => {
  const { cwd, run } = await setup();

  await run('prepare', '--id', 'test', '--participants', 'participants.json');
  const before = await readFile(join(cwd, 'public/campaigns/test/draws.json'), 'utf8');

  await rm(join(cwd, '.private/campaigns/test/campaign.enc.json'));
  await expect(
    run('prepare', '--id', 'test', '--participants', 'participants.json'),
  ).rejects.toThrow();
  expect(await readFile(join(cwd, 'public/campaigns/test/draws.json'), 'utf8')).toBe(before);
});

it('allows local inspection of Actions campaigns but blocks preparation and resolution', async () => {
  const { cwd, env, run } = await setup();

  await run('prepare', '--id', 'test', '--participants', 'participants.json');
  const localPath = join(cwd, '.private/campaigns/test/campaign.enc.json');
  const actionsPath = join(cwd, 'state/campaigns/test/campaign.enc.json');
  const campaign = await readCampaign(localPath, env.SANTA_ARCHIVE_KEY!);

  campaign.executor = 'github-actions';
  campaign.records[0].status = 'sending';
  await saveCampaign(actionsPath, campaign, env.SANTA_ARCHIVE_KEY!);
  await expect(run('check', '--id', 'test')).rejects.toThrow();
  await rm(localPath);
  await run('check', '--id', 'test');
  await run('mail', '--id', 'test');
  const before = await readFile(actionsPath, 'utf8');

  await expect(
    run('prepare', '--id', 'test', '--participants', 'participants.json'),
  ).rejects.toThrow();
  await expect(
    run(
      'resolve',
      '--id',
      'test',
      '--confirm',
      'test',
      '--record',
      campaign.records[0].id,
      '--status',
      'pending',
    ),
  ).rejects.toThrow();
  expect(await readFile(actionsPath, 'utf8')).toBe(before);
});

it('rejects an archive placed in the wrong executor store', async () => {
  const { cwd, env, run } = await setup();

  await run('prepare', '--id', 'test', '--participants', 'participants.json');
  const localPath = join(cwd, '.private/campaigns/test/campaign.enc.json');
  const campaign = await readCampaign(localPath, env.SANTA_ARCHIVE_KEY!);

  await saveCampaign(
    join(cwd, 'state/campaigns/test/campaign.enc.json'),
    campaign,
    env.SANTA_ARCHIVE_KEY!,
  );
  await rm(localPath);
  await expect(run('check', '--id', 'test')).rejects.toThrow();
});
