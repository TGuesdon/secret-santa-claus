import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { loadDraw, type Result } from './lib/draw-loader';
import { parseLink } from './lib/link';

function subscribeToLink(callback: () => void) {
  window.addEventListener('hashchange', callback);

  return () => window.removeEventListener('hashchange', callback);
}

type RevealState =
  | { status: 'idle' | 'loading' }
  | { status: 'success'; result: Result }
  | { status: 'error'; message: string };

function Reveal({ fragment }: { fragment: string }) {
  const [state, setState] = useState<RevealState>({ status: 'idle' });
  const active = useRef(true);

  useEffect(() => {
    active.current = true;

    return () => {
      active.current = false;
    };
  }, []);

  let invalid = false;

  try {
    parseLink(fragment);
  } catch {
    invalid = true;
  }

  async function reveal() {
    setState({ status: 'loading' });

    try {
      const result = await loadDraw(fragment, `${import.meta.env.BASE_URL}draws.json`);

      if (active.current) {
        setState({ status: 'success', result });
      }
    } catch (error) {
      if (active.current) {
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Unable to reveal the draw.',
        });
      }
    }
  }

  if (invalid) {
    return (
      <p role="alert">
        This personal link is incomplete or invalid. Ask the organizer for the complete link.
      </p>
    );
  }

  if (state.status === 'success') {
    return (
      <p role="status">
        Hello {state.result.participantName}! Your gift recipient is{' '}
        <strong>{state.result.recipientName}</strong> 🎁
      </p>
    );
  }

  return (
    <>
      <p>Your draw is ready. Keep this link private.</p>
      <button onClick={reveal} disabled={state.status === 'loading'}>
        {state.status === 'loading' ? 'Loading…' : 'Reveal my draw'}
      </button>
      {state.status === 'error' && <p role="alert">{state.message}</p>}
    </>
  );
}

export default function App() {
  const fragment = useSyncExternalStore(
    subscribeToLink,
    () => window.location.hash,
    () => '',
  );

  return (
    <main>
      <h1>Secret Santa</h1>
      {fragment ? (
        <Reveal key={fragment} fragment={fragment} />
      ) : (
        <p>
          You need a personal link to reveal your draw. Open the link you received by email or scan
          your QR code.
        </p>
      )}
    </main>
  );
}
