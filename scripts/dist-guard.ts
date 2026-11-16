import { lstat, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { validateDraw } from '../src/lib/draw-loader';

export async function inspectDist(
  root: string,
  expectedDraw: string,
  env: NodeJS.ProcessEnv,
): Promise<void> {
  validateDraw(JSON.parse(expectedDraw));
  if ((await readFile(join(root, 'draws.json'), 'utf8')) !== expectedDraw) {
    throw new Error('The build modified the public draw.');
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
        if (relative !== 'assets') {
          throw new Error('Unexpected directory in the build.');
        }

        await inspect(path, 'assets/');
        continue;
      }

      // Allow new asset categories explicitly to keep private files out of the site.
      if (
        !['index.html', 'draws.json', 'jingle_bell.mp3', 'intro_loop.mp3'].includes(relative) &&
        !/^assets\/[\w-]+\.(js|css)$/.test(relative)
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
