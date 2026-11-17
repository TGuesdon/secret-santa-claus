// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from '../src/App';
import fixtures from '../fixtures/demo.json';
import { encrypt } from '../src/lib/crypto';
import { loadDraw } from '../src/lib/draw-loader';

beforeEach(() => {
  window.location.hash = '';
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
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
  expect(screen.getByRole('heading', { name: 'Secret Santa' })).toBeDefined();
  expect(screen.getByText(/lien personnel/i)).toBeDefined();
});

it.each(fixtures)('reveals $name’s known fixture only after clicking', async (p) => {
  await mockDraw();
  window.location.hash = `#v1.${p.id}.${p.key}`;
  vi.useFakeTimers();
  render(<App />);
  expect(screen.queryByText(new RegExp(`Joyeux Noël ${p.name}`))).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /révéler/i }));
  await act(() => vi.advanceTimersByTimeAsync(6900));
  vi.useRealTimers();
  expect((await screen.findByRole('status')).textContent).toContain(p.recipientName);
  expect(screen.getByText(new RegExp(`Joyeux Noël ${p.name}`))).toBeDefined();
  expect(screen.getByRole('status').textContent).toContain(p.recipientName);
});

it('shows errors without displaying raw decrypted data', async () => {
  await mockDraw();
  window.location.hash = `#v1.${fixtures[0].id}.${fixtures[1].key}`;
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /révéler/i }));
  expect((await screen.findByRole('alert')).textContent).toMatch(/déchiffrer/);
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
  fireEvent.click(screen.getByRole('button', { name: /révéler/i }));
  const encrypted = await encrypt(
    { participantName: 'Alice', recipientName: 'Bob' },
    fixtures[0].key,
  );

  window.location.hash = '';
  fireEvent(window, new HashChangeEvent('hashchange'));
  finish(new Response(JSON.stringify({ version: 1, entries: { [fixtures[0].id]: encrypted } })));
  await waitFor(() => expect(screen.queryByText(/Joyeux Noël Alice/)).toBeNull());
  expect(screen.getByText(/lien personnel/i)).toBeDefined();
});

it('keeps the recipient out of the DOM until the 6.8-second reveal', async () => {
  await mockDraw();
  window.location.hash = `#v1.${fixtures[0].id}.${fixtures[0].key}`;
  vi.useFakeTimers();
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /révéler/i }));
  await act(() => vi.advanceTimersByTimeAsync(6700));
  expect(screen.queryByText(fixtures[0].recipientName)).toBeNull();

  await act(() => vi.advanceTimersByTimeAsync(200));
  vi.useRealTimers();
  expect((await screen.findByRole('status')).textContent).toContain(fixtures[0].recipientName);
});

it('waits for a slow result even after the musical drop', async () => {
  let finish: (response: Response) => void = () => {};
  const encrypted = await encrypt(
    { participantName: 'Alice', recipientName: 'Bob' },
    fixtures[0].key,
  );

  vi.stubGlobal(
    'fetch',
    () =>
      new Promise<Response>((resolve) => {
        finish = resolve;
      }),
  );
  window.location.hash = `#v1.${fixtures[0].id}.${fixtures[0].key}`;
  vi.useFakeTimers();
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /révéler/i }));
  await act(() => vi.advanceTimersByTimeAsync(6900));
  expect(screen.queryByText('Bob')).toBeNull();
  vi.useRealTimers();

  finish(new Response(JSON.stringify({ version: 1, entries: { [fixtures[0].id]: encrypted } })));
  expect((await screen.findByRole('status')).textContent).toContain('Bob');
});

it('reveals with sound disabled and transfers keyboard focus to the recipient', async () => {
  await mockDraw();
  window.location.hash = `#v1.${fixtures[0].id}.${fixtures[0].key}`;
  vi.useFakeTimers();
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Son' }));
  fireEvent.click(screen.getByRole('button', { name: /révéler/i }));
  await act(() => vi.advanceTimersByTimeAsync(6900));
  vi.useRealTimers();
  const result = await screen.findByRole('status');

  expect(result.textContent).toContain('Bob');
  expect(document.activeElement).toBe(result);
  expect(screen.getByRole('button', { name: 'Son' }).getAttribute('aria-pressed')).toBe('false');
});

it('preserves a long recipient name without truncation', async () => {
  const recipientName = 'Alexandria Charlotte de Winter-Snow';
  const encrypted = await encrypt({ participantName: 'Alice', recipientName }, fixtures[0].key);

  vi.stubGlobal(
    'fetch',
    async () =>
      new Response(
        JSON.stringify({
          version: 1,
          entries: { [fixtures[0].id]: encrypted },
        }),
      ),
  );
  window.location.hash = `#v1.${fixtures[0].id}.${fixtures[0].key}`;
  vi.useFakeTimers();
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /révéler/i }));
  await act(() => vi.advanceTimersByTimeAsync(6900));
  vi.useRealTimers();
  expect((await screen.findByRole('status')).textContent).toContain(recipientName);
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

it('shows the French reveal immediately and recovers from blocked autoplay', async () => {
  await mockDraw();
  vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new Error('Autoplay blocked'));
  window.location.hash = '#v1.' + fixtures[0].id + '.' + fixtures[0].key;
  render(<App />);
  expect(screen.getByRole('button', { name: /révéler mon tirage/i })).toBeDefined();
  expect(screen.queryByRole('button', { name: /open|surprise/i })).toBeNull();
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
  const enableSound = await screen.findByRole('button', { name: 'Activer le son' });

  fireEvent.click(enableSound);
  expect(screen.getByRole('button', { name: 'Son' })).toBeDefined();
});
