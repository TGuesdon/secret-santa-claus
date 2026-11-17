import { wording } from './locales/fr';
import { DrawError } from './lib/draw-error';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ChristmasScene, Snow } from './components/ChristmasScene';
import { FestiveBackdrop } from './components/FestiveBackdrop';
import type { CSSProperties } from 'react';
import { Icon } from './components/Icons';
import { loadDraw, type Result } from './lib/draw-loader';
import { parseLink, campaignFromSearch, drawPath } from './lib/link';
import { DROP_SECONDS, Soundtrack } from './lib/soundtrack';

function subscribeToLink(callback: () => void) {
  window.addEventListener('hashchange', callback);
  window.addEventListener('popstate', callback);

  return () => {
    window.removeEventListener('hashchange', callback);
    window.removeEventListener('popstate', callback);
  };
}

function subscribeToMotion(callback: () => void) {
  const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');

  preference?.addEventListener('change', callback);

  return () => preference?.removeEventListener('change', callback);
}

type RevealState =
  | { status: 'ready' | 'opening' }
  | { status: 'success'; result: Result }
  | { status: 'error'; message: string };

function Experience({ fragment, search }: { fragment: string; search: string }) {
  const [state, setState] = useState<RevealState>({ status: 'ready' });
  const [muted, setMuted] = useState(false);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const [motionPaused, setMotionPaused] = useState(false);
  const soundtrack = useRef<Soundtrack | null>(null);
  const recipient = useRef<HTMLDivElement>(null);
  const active = useRef(true);
  const reducedMotion = useSyncExternalStore(
    subscribeToMotion,
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
    () => false,
  );

  let invalid = false;
  let campaignId: string | undefined;

  try {
    campaignId = campaignFromSearch(search);
  } catch {
    invalid = true;
  }

  if (fragment) {
    try {
      parseLink(fragment);
    } catch {
      invalid = true;
    }
  }

  const hasLink = Boolean(fragment) && !invalid;
  const opening = state.status === 'opening';
  const revealed = state.status === 'success';
  const animationsOff = reducedMotion || motionPaused;
  const soundLabel = soundBlocked ? wording.sound.enable : wording.sound.label;
  const soundState = muted ? wording.sound.muted : wording.sound.enabled;

  useEffect(() => {
    active.current = true;
    const music = new Soundtrack(() => setSoundBlocked(true));

    soundtrack.current = music;

    // A blocked intro must never hide the reveal button.
    if (hasLink) {
      music.enter();
    }

    return () => {
      active.current = false;
      music.dispose();
    };
  }, [hasLink]);

  useEffect(() => {
    if (state.status === 'success') {
      recipient.current?.focus({ preventScroll: true });
    }
  }, [state.status]);

  function toggleSound() {
    const nextMuted = soundBlocked ? false : !muted;

    setMuted(nextMuted);
    setSoundBlocked(false);
    soundtrack.current?.setMuted(nextMuted);
  }

  async function reveal() {
    if (!soundtrack.current || opening) {
      return;
    }

    setState({ status: 'opening' });
    setSoundBlocked(false);

    // Decrypt during the build-up, but never mount the name before the drop.
    const musicalDrop = new Promise<void>((resolve) => {
      soundtrack.current!.reveal(resolve);
    });

    try {
      const [result] = await Promise.all([
        loadDraw(fragment, `${import.meta.env.BASE_URL}${drawPath(campaignId)}`),
        musicalDrop,
      ]);

      if (active.current) {
        setState({ status: 'success', result });
      }
    } catch (error) {
      if (active.current) {
        soundtrack.current?.retry();
        setState({
          status: 'error',
          message:
            error instanceof DrawError
              ? wording.errors.draw[error.code]
              : wording.errors.unexpected,
        });
      }
    }
  }

  let heading = (
    <>
      {wording.ready.heading}
      <br />
      <em>{wording.ready.emphasis}</em>
    </>
  );
  let description: string = wording.ready.description;

  if (opening) {
    heading = (
      <>
        {wording.opening.heading}
        <br />
        <em>{wording.opening.emphasis}</em>
      </>
    );
    description = wording.opening.description;
  }

  if (revealed) {
    heading = (
      <>
        {wording.revealed.heading}
        <br />
        <em>{wording.revealed.emphasis}</em>
      </>
    );
    description = wording.revealed.description(state.result.participantName);
  }

  return (
    <div
      className={`christmas-app ${animationsOff ? 'motion-paused' : ''}`}
      style={{ '--reveal-duration': `${DROP_SECONDS}s` } as CSSProperties}
    >
      <div className="fairy-lights" aria-hidden="true">
        {Array.from({ length: 16 }, (_, index) => (
          <span key={index} />
        ))}
      </div>
      <Snow />
      <FestiveBackdrop />
      <header className="site-header">
        <h1 className="brand">
          <Icon name="gift" />
          <span>
            {wording.brand}
            <span className="brand-dot" aria-hidden="true">
              .
            </span>
          </span>
        </h1>
        <div className="experience-controls">
          <button
            className="quiet-button"
            onClick={toggleSound}
            aria-label={soundLabel}
            aria-pressed={soundBlocked ? undefined : !muted}
          >
            <Icon name={muted || soundBlocked ? 'muted' : 'sound'} />
            <span>
              {soundLabel}{' '}
              {!soundBlocked && (
                <span className="control-state" aria-hidden="true">
                  {soundState}
                </span>
              )}
            </span>
          </button>
          <button
            className="quiet-button motion-button"
            onClick={() => setMotionPaused(!motionPaused)}
            aria-label={wording.motion.label}
            aria-pressed={!animationsOff}
            disabled={reducedMotion}
          >
            <Icon name={animationsOff ? 'play' : 'pause'} />
            <span>
              {wording.motion.label}{' '}
              <span className="control-state" aria-hidden="true">
                {animationsOff ? wording.motion.paused : wording.motion.enabled}
              </span>
            </span>
          </button>
        </div>
      </header>

      <main className="experience">
        <div className="heading-group">
          <h2>{heading}</h2>
          <p className="scene-description">{description}</p>
        </div>

        <ChristmasScene opening={opening} revealed={revealed}>
          {revealed && (
            <div className="recipient" role="status" ref={recipient} tabIndex={-1}>
              <span className="recipient-label">{wording.revealed.recipientLabel}</span>
              <strong>{state.result.recipientName}</strong>
              <span className="recipient-note">{wording.revealed.recipientNote}</span>
            </div>
          )}
        </ChristmasScene>

        <div className="action-area">
          {!hasLink && (
            <div className="link-message" role={invalid ? 'alert' : undefined}>
              {invalid ? (
                <>
                  <h3>{wording.link.invalidHeading}</h3>
                  <p>{wording.link.invalidDescription}</p>
                </>
              ) : (
                <p>{wording.link.missing}</p>
              )}
            </div>
          )}
          {hasLink && !revealed && (
            <>
              <button className="primary-button" onClick={reveal} disabled={opening}>
                {opening ? wording.opening.action : wording.ready.action}
                {!opening && <Icon name="gift" />}
              </button>
              <p className="action-note">{opening ? wording.opening.note : wording.ready.note}</p>
            </>
          )}
          {revealed && (
            <p className="success-note">
              <Icon name="star" /> {wording.revealed.note}
            </p>
          )}
          {state.status === 'error' && (
            <p className="error-message" role="alert">
              {state.message}
            </p>
          )}
          {soundBlocked && <p className="audio-message">{wording.sound.blocked}</p>}
        </div>
      </main>

      <footer className="site-footer">
        <span>{wording.footer.credits}</span>
        <span>{wording.footer.motto}</span>
      </footer>
    </div>
  );
}

export default function App() {
  const fragment = useSyncExternalStore(
    subscribeToLink,
    () => window.location.hash,
    () => '',
  );

  const search = useSyncExternalStore(
    subscribeToLink,
    () => window.location.search,
    () => '',
  );

  // A new invitation gets its own result, timers and playback lifetime.
  return <Experience key={`${search}${fragment}`} fragment={fragment} search={search} />;
}
