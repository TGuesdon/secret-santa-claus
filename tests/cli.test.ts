import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { afterEach, expect, it } from 'vitest';
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
  const env = {
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
  const archivePath = join(cwd, '.private/campaign.enc.json');
  const archiveBefore = await readFile(archivePath, 'utf8');
  const drawBefore = await readFile(join(cwd, 'public/draws.json'), 'utf8');
  const exportScript = resolve('scripts/export-archive.ts');
  const exportArgs = ['--import', tsx, exportScript, '--archive', archivePath];
  const output = await exec(process.execPath, exportArgs, { cwd, env });
  const campaign = JSON.parse(
    await readFile(join(cwd, '.private/exports/export-test.json'), 'utf8'),
  );

  expect(campaign.id).toBe('export-test');
  expect(campaign.records).toHaveLength(2);
  expect(campaign.records[0].url).toContain('#v1.');
  expect(output.stdout).not.toContain(campaign.records[0].key);
  expect(output.stdout).not.toContain(campaign.records[0].email);
  expect(await readFile(archivePath, 'utf8')).toBe(archiveBefore);
  expect(await readFile(join(cwd, 'public/draws.json'), 'utf8')).toBe(drawBefore);

  await expect(
    exec(process.execPath, exportArgs, {
      cwd,
      env: { ...env, SANTA_ARCHIVE_KEY: randomToken(32) },
    }),
  ).rejects.toMatchObject({ stderr: expect.stringContaining('Archive export failed.') });
  expect(
    JSON.parse(await readFile(join(cwd, '.private/exports/export-test.json'), 'utf8')),
  ).toEqual(campaign);
});

it('generates demo links/QR and protects a production draw from the demo command', async () => {
  const { cwd, run } = await setup();

  await run('demo');
  const demo = JSON.parse(await readFile(join(cwd, '.private/demo/links.json'), 'utf8'));

  expect(demo).toHaveLength(4);
  expect(await readFile(join(cwd, '.private/demo/qr/1.png'))).toBeInstanceOf(Buffer);
  await run('prepare', '--id', 'test', '--participants', 'participants.json');
  const before = await readFile(join(cwd, 'public/draws.json'), 'utf8');

  await expect(run('demo')).rejects.toThrow();
  expect(await readFile(join(cwd, 'public/draws.json'), 'utf8')).toBe(before);
});

it('resumes preparation without redrawing and dry-runs without Gmail credentials', async () => {
  const { cwd, run } = await setup();

  await run('prepare', '--id', 'test', '--participants', 'participants.json');
  const before = await readFile(join(cwd, 'public/draws.json'), 'utf8');

  await run('prepare', '--id', 'test');
  expect(await readFile(join(cwd, 'public/draws.json'), 'utf8')).toBe(before);
  const out = await run('mail');

  expect(out.stdout).toContain('Dry-run');
  expect(out.stdout).not.toContain('alice@example.com');
  await expect(
    run('prepare', '--id', 'different', '--participants', 'participants.json'),
  ).rejects.toThrow();
  expect(await readFile(join(cwd, 'public/draws.json'), 'utf8')).toBe(before);
});

it('fails closed on unknown arguments and altered public files', async () => {
  const { cwd, run } = await setup();

  await expect(
    run('prepare', '--id', 'test', '--particpants', 'participants.json'),
  ).rejects.toThrow();
  await run('prepare', '--id', 'test', '--participants', 'participants.json');
  await writeFile(join(cwd, 'public/draws.json'), '{}');
  await expect(run('check')).rejects.toThrow();
});

it('uses the default sender when the optional Actions variable is empty', async () => {
  const { cwd, env, run } = await setup();

  env.SANTA_SENDER_NAME = '';

  await run('prepare', '--id', 'test', '--participants', 'participants.json');
  await run('mail');

  const preview = await readFile(join(cwd, '.private/emails/1.eml'));
  const message = await simpleParser(preview);

  expect(message.from?.value[0].name).toBe('Santa Claus 🎅');
});
