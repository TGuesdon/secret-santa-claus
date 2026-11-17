import { lstat, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { drawPath, validateCampaignId } from '../src/lib/link';
import { validateDraw } from '../src/lib/draw-loader';

export async function inspectDist(
  root: string,
  expectedDraws: Record<string, string>,
  env: NodeJS.ProcessEnv,
): Promise<void> {
  const allowedDirectories = new Set(['assets', 'config']);

  for (const [relative, expectedDraw] of Object.entries(expectedDraws)) {
    if (relative !== 'draws.json') {
      const match = /^campaigns\/([^/]+)\/draws\.json$/.exec(relative);

      if (!match) {
        throw new Error('Invalid public draw path.');
      }

      validateCampaignId(match[1]);
      allowedDirectories.add('campaigns');
      allowedDirectories.add(`campaigns/${match[1]}`);
    }

    validateDraw(JSON.parse(expectedDraw));

    if ((await readFile(join(root, relative), 'utf8')) !== expectedDraw) {
      throw new Error('The build modified the public draw.');
    }
  }

  const secrets = Object.entries(env)
    .filter(
      ([name, value]) =>
        /^(GOOGLE_APPLICATION_PASSWORD$|SANTA_ARCHIVE_KEY$|SANTA_PARTICIPANTS_JSON$|SANTA_SENDER_EMAIL$)/.test(
          name,
        ) &&
        value &&
        value.length >= 8,
    )
    .flatMap(([name, value]) => {
      if (name === 'GOOGLE_APPLICATION_PASSWORD') {
        return [value!, value!.replace(/\s/g, '')];
      }

      return [value!];
    })
    .filter((secret) => secret.length >= 8);

  async function inspect(folder: string, prefix = ''): Promise<void> {
    for (const name of await readdir(folder)) {
      const relative = prefix + name;
      const path = join(folder, name);
      const info = await lstat(path);

      if (info.isSymbolicLink()) {
        throw new Error('Symbolic links are not allowed in the build.');
      }

      if (info.isDirectory()) {
        if (!allowedDirectories.has(relative)) {
          throw new Error('Unexpected directory in the build.');
        }

        await inspect(path, `${relative}/`);
        continue;
      }

      // Allow new asset categories explicitly to keep private files out of the site.
      if (
        !Object.hasOwn(expectedDraws, relative) &&
        ![
          'index.html',
          'config/index.html',
          'favicon.ico',
          'jingle_bell.mp3',
          'intro_loop.mp3',
        ].includes(relative) &&
        !/^assets\/[\w-]+\.(js|css|webp|ttf|woff2)$/.test(relative)
      ) {
        throw new Error('Unexpected file in the build.');
      }

      const contents = await readFile(path);

      if (
        secrets.some((secret) => contents.includes(Buffer.from(secret))) ||
        /GOOGLE_APPLICATION_PASSWORD|SANTA_ARCHIVE_KEY|\.private\//.test(contents.toString('utf8'))
      ) {
        throw new Error('Private data found in the build.');
      }
    }
  }

  await inspect(root);
}

export async function readPublicDraws(publicRoot: string): Promise<Record<string, string>> {
  const draws: Record<string, string> = {
    'draws.json': await readFile(join(publicRoot, 'draws.json'), 'utf8'),
  };
  const campaignDirectory = join(publicRoot, 'campaigns');
  let campaigns;

  try {
    campaigns = await readdir(campaignDirectory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return draws;
    }

    throw error;
  }

  for (const id of campaigns) {
    const relative = drawPath(id);

    draws[relative] = await readFile(join(publicRoot, relative), 'utf8');
  }

  return draws;
}
