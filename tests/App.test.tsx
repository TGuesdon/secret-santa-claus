// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from '../src/App';
import fixtures from '../fixtures/demo.json';
import { encrypt } from '../src/lib/crypto';
import { loadDraw } from '../src/lib/draw-loader';

beforeEach(() => {
  window.history.replaceState(null, '', '/');
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

function openEnvelope() {
  fireEvent.click(screen.getByRole('button', { name: 'Animations' }));
  fireEvent.click(screen.getByRole('button', { name: /ouvrir le rideau/i }));
  fireEvent.click(screen.getByRole('button', { name: /ouvrir la lettre/i }));
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
  expect(screen.queryByRole('status')).toBeNull();
  openEnvelope();
  await act(() => vi.advanceTimersByTimeAsync(6900));
  vi.useRealTimers();
  expect((await screen.findByRole('status')).textContent).toContain(p.recipientName);
});

it('shows errors without displaying raw decrypted data', async () => {
  await mockDraw();
  window.location.hash = `#v1.${fixtures[0].id}.${fixtures[1].key}`;
  render(<App />);
  openEnvelope();
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
  openEnvelope();
  const encrypted = await encrypt(
    { participantName: 'Alice', recipientName: 'Bob' },
    fixtures[0].key,
  );

  window.location.hash = '';
  fireEvent(window, new HashChangeEvent('hashchange'));
  finish(new Response(JSON.stringify({ version: 1, entries: { [fixtures[0].id]: encrypted } })));
  await waitFor(() => expect(screen.getByText(/lien personnel/i)).toBeDefined());
  expect(screen.queryByRole('status')).toBeNull();
});

it('keeps the recipient out of the DOM until the reveal cue', async () => {
  await mockDraw();
  window.location.hash = `#v1.${fixtures[0].id}.${fixtures[0].key}`;
  vi.useFakeTimers();
  render(<App />);
  openEnvelope();
  await act(() => vi.advanceTimersByTimeAsync(6450));
  expect(screen.queryByText(fixtures[0].recipientName)).toBeNull();

  await act(() => vi.advanceTimersByTimeAsync(50));
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
  openEnvelope();
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
  openEnvelope();
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
  openEnvelope();
  await act(() => vi.advanceTimersByTimeAsync(6900));
  vi.useRealTimers();
  expect((await screen.findByRole('status')).textContent).toContain(recipientName);
});

it('rejects malformed links before fetching', async () => {
  await expect(
    loadDraw('#v1.bad.link', '/repo/draws.json', async () => {
      throw new Error('must not fetch');
    }),
  ).rejects.toMatchObject({ code: 'invalid-link' });
});

it('handles missing IDs, unsupported schemas, network errors and HTTP failures', async () => {
  const fragment = `#v1.${fixtures[0].id}.${fixtures[0].key}`;

  await expect(
    loadDraw(fragment, '/repo/draws.json', async () => new Response('{"version":1,"entries":{}}')),
  ).rejects.toMatchObject({ code: 'not-found' });
  await expect(
    loadDraw(fragment, '/repo/draws.json', async () => new Response('{"version":2}')),
  ).rejects.toMatchObject({ code: 'unsupported-version' });
  await expect(
    loadDraw(fragment, '/repo/draws.json', async () => {
      throw new Error('offline');
    }),
  ).rejects.toMatchObject({ code: 'load-failed' });
  await expect(
    loadDraw(fragment, '/repo/draws.json', async () => new Response('', { status: 404 })),
  ).rejects.toMatchObject({ code: 'load-failed' });
  await expect(
    loadDraw(fragment, '/repo/draws.json', async () => new Response('<html>bad</html>')),
  ).rejects.toMatchObject({ code: 'load-failed' });
});

it('starts the intro from the curtain gesture and delivers the letter even without audio', async () => {
  await mockDraw();
  const play = vi.mocked(HTMLMediaElement.prototype.play);

  play.mockRejectedValueOnce(new Error('Playback blocked'));
  window.location.hash = '#v1.' + fixtures[0].id + '.' + fixtures[0].key;
  vi.useFakeTimers();
  render(<App />);
  expect(play).not.toHaveBeenCalled();
  expect(screen.queryByRole('heading', { name: /qui vas-tu gâter/i })).toBeNull();
  expect(screen.queryByRole('button', { name: /ouvrir la lettre/i })).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: /ouvrir le rideau/i }));
  expect(play).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('heading', { name: /qui vas-tu gâter/i })).toBeNull();
  expect(screen.queryByRole('button', { name: /ouvrir la lettre/i })).toBeNull();

  await act(() => vi.advanceTimersByTimeAsync(6400));
  expect(screen.getByRole('button', { name: 'Activer le son' })).toBeDefined();
  expect(screen.getByRole('heading', { name: /qui vas-tu gâter/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /ouvrir la lettre/i })).toBeDefined();
  expect(fetch).not.toHaveBeenCalled();
});

it('loads the campaign selected in the personal URL', async () => {
  await mockDraw();
  window.history.replaceState(
    null,
    '',
    `/?campaign=family#v1.${fixtures[0].id}.${fixtures[0].key}`,
  );
  vi.useFakeTimers();
  render(<App />);
  openEnvelope();
  await act(() => vi.advanceTimersByTimeAsync(6900));
  vi.useRealTimers();

  expect((await screen.findByRole('status')).textContent).toContain('Bob');
  expect(fetch).toHaveBeenCalledWith('/campaigns/family/draws.json', expect.any(Object));
});

it('rejects an invalid campaign query before fetching', () => {
  const fetcher = vi.fn();

  vi.stubGlobal('fetch', fetcher);
  window.history.replaceState(
    null,
    '',
    `/?campaign=../escape#v1.${fixtures[0].id}.${fixtures[0].key}`,
  );
  render(<App />);

  expect(screen.queryByRole('button', { name: /ouvrir le rideau/i })).toBeNull();
  expect(fetcher).not.toHaveBeenCalled();
});

it.each([
  ['{"version":2}', /format incompatible/],
  ['{"version":1,"entries":{}}', /Aucun tirage/],
])('maps domain failures to French copy for response %s', async (body, message) => {
  vi.stubGlobal('fetch', async () => new Response(body));
  window.location.hash = `#v1.${fixtures[0].id}.${fixtures[0].key}`;
  render(<App />);
  openEnvelope();

  expect((await screen.findByRole('alert')).textContent).toMatch(message);
});

it('does not interpret diagnostic messages as domain error codes', async () => {
  vi.stubGlobal('fetch', async () => {
    throw new Error('Unsupported draw version.');
  });
  window.location.hash = `#v1.${fixtures[0].id}.${fixtures[0].key}`;
  render(<App />);
  openEnvelope();

  expect((await screen.findByRole('alert')).textContent).toMatch(/Vérifie ta connexion/);
});
