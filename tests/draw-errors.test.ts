import { expect, it } from 'vitest';
import { loadDraw, validateDraw } from '../src/lib/draw-loader';
import fixtures from '../fixtures/demo.json';

const fragment = `#v1.${fixtures[0].id}.${fixtures[0].key}`;

it.each([
  ['not-found', '{"version":1,"entries":{}}'],
  ['unsupported-version', '{"version":2}'],
  ['invalid-draw', '{"version":1,"entries":null}'],
  ['load-failed', '<html>invalid JSON</html>'],
])('reports a stable %s code independently of diagnostic wording', async (code, body) => {
  await expect(
    loadDraw(fragment, '/draws.json', async () => new Response(body)),
  ).rejects.toMatchObject({ name: 'DrawError', code });
});

it('reports invalid links before any network access', async () => {
  await expect(
    loadDraw('#invalid', '/draws.json', async () => {
      throw new Error('Must not fetch');
    }),
  ).rejects.toMatchObject({ name: 'DrawError', code: 'invalid-link' });
});

it('reports a typed invalid draw for malformed encrypted entries', () => {
  try {
    validateDraw({ version: 1, entries: { [fixtures[0].id]: { iv: 'bad', ciphertext: 'bad' } } });
    expect.fail('Expected validation to fail');
  } catch (error) {
    expect(error).toMatchObject({ name: 'DrawError', code: 'invalid-draw' });
  }
});

it('reports a typed decryption error without leaking decrypted content', async () => {
  const entries = { [fixtures[0].id]: { iv: 'AAAAAAAAAAAAAAAA', ciphertext: 'A'.repeat(24) } };

  await expect(
    loadDraw(
      fragment,
      '/draws.json',
      async () => new Response(JSON.stringify({ version: 1, entries })),
    ),
  ).rejects.toMatchObject({ name: 'DrawError', code: 'decryption-failed' });
});
