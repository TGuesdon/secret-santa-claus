// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from '../src/App';
import fixtures from '../fixtures/demo.json';
import { encrypt } from '../src/lib/crypto';
import { loadDraw } from '../src/lib/draw-loader';

beforeEach(() => {
  window.location.hash = '';
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function mockDraw() {
  const entries: Record<string, Awaited<ReturnType<typeof encrypt>>> = {};

  for (const p of fixtures) {
    entries[p.id] = await encrypt(
      { participantName: p.name, recipientName: p.recipientName },
      p.key,
    );
  }

  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ version: 1, entries }))),
  );
}

it('shows instructions without fetching data when no link is present', () => {
  vi.stubGlobal('fetch', () => {
    throw new Error('unexpected fetch');
  });
  render(<App />);
  expect(screen.getByRole('heading').textContent).toBe('Secret Santa');
  expect(screen.getByText(/personal link/i)).toBeDefined();
});

it.each(fixtures)('reveals $name’s known fixture only after clicking', async (p) => {
  await mockDraw();
  window.location.hash = `#v1.${p.id}.${p.key}`;
  render(<App />);
  expect(screen.queryByText(new RegExp(`Hello ${p.name}`))).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /reveal/i }));
  expect((await screen.findByRole('status')).textContent).toContain(`Hello ${p.name}`);
  expect(screen.getByRole('status').textContent).toContain(p.recipientName);
});

it('shows errors without displaying raw decrypted data', async () => {
  await mockDraw();
  window.location.hash = `#v1.${fixtures[0].id}.${fixtures[1].key}`;
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /reveal/i }));
  expect((await screen.findByRole('alert')).textContent).toMatch(/decrypt/);
});

it('invalidates an in-flight reveal when the personal link changes', async () => {
  let finish: (response: Response) => void = () => {};

  vi.stubGlobal(
    'fetch',
    () =>
      new Promise<Response>((resolve) => {
        finish = resolve;
      }),
  );
  window.location.hash = `#v1.${fixtures[0].id}.${fixtures[0].key}`;
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /reveal/i }));
  const encrypted = await encrypt(
    { participantName: 'Alice', recipientName: 'Bob' },
    fixtures[0].key,
  );

  window.location.hash = '';
  fireEvent(window, new HashChangeEvent('hashchange'));
  finish(new Response(JSON.stringify({ version: 1, entries: { [fixtures[0].id]: encrypted } })));
  await waitFor(() => expect(screen.queryByText(/Hello Alice/)).toBeNull());
  expect(screen.getByText(/personal link/i)).toBeDefined();
});

it('rejects malformed links before fetching', async () => {
  await expect(
    loadDraw('#v1.bad.link', '/repo/draws.json', async () => {
      throw new Error('must not fetch');
    }),
  ).rejects.toThrow(/invalid/);
});

it('handles missing IDs, unsupported schemas, network errors and HTTP failures', async () => {
  const fragment = `#v1.${fixtures[0].id}.${fixtures[0].key}`;

  await expect(
    loadDraw(fragment, '/repo/draws.json', async () => new Response('{"version":1,"entries":{}}')),
  ).rejects.toThrow(/No available draw/);
  await expect(
    loadDraw(fragment, '/repo/draws.json', async () => new Response('{"version":2}')),
  ).rejects.toThrow(/version/);
  await expect(
    loadDraw(fragment, '/repo/draws.json', async () => {
      throw new Error('offline');
    }),
  ).rejects.toThrow(/connection/);
  await expect(
    loadDraw(fragment, '/repo/draws.json', async () => new Response('', { status: 404 })),
  ).rejects.toThrow(/connection/);
  await expect(
    loadDraw(fragment, '/repo/draws.json', async () => new Response('<html>bad</html>')),
  ).rejects.toThrow(/connection/);
});
