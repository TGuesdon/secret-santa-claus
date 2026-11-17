import { Brand } from './components/Brand';
import { wording } from './locales/fr';
import { DrawError } from './lib/draw-error';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ChristmasScene, Snow } from './components/ChristmasScene';
import { FestiveBackdrop } from './components/FestiveBackdrop';
import { StageCurtain } from './components/StageCurtain';
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
  | { status: 'closed' | 'arrival' | 'ready' | 'opening' }
  | { status: 'success'; result: Result }
  | { status: 'error'; message: string };

const SLEIGH_FLIGHT_MILLISECONDS = 6400;

function Experience({ fragment, search }: { fragment: string; search: string }) {
  const [state, setState] = useState<RevealState>({ status: 'closed' });
  const [muted, setMuted] = useState(false);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const [motionPaused, setMotionPaused] = useState(false);
  const soundtrack = useRef<Soundtrack | null>(null);
  const stageHeading = useRef<HTMLHeadingElement>(null);
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
  const curtainClosed = hasLink && state.status === 'closed';
  const arriving = state.status === 'arrival';
  const opening = state.status === 'opening';
  const revealed = state.status === 'success';
  const letterDelivered = hasLink && !curtainClosed && !arriving;
  const animationsOff = reducedMotion || motionPaused;
  const soundLabel = soundBlocked ? wording.sound.enable : wording.sound.label;
  const soundState = muted ? wording.sound.muted : wording.sound.enabled;

  useEffect(() => {
    active.current = true;
    const music = new Soundtrack(() => setSoundBlocked(true));

    soundtrack.current = music;

    return () => {
      active.current = false;
      music.dispose();
    };
  }, []);

  useEffect(() => {
    if (!arriving) {
      return;
    }

    const arrival = window.setTimeout(
      () => setState({ status: 'ready' }),
      animationsOff ? 0 : SLEIGH_FLIGHT_MILLISECONDS,
    );

    return () => window.clearTimeout(arrival);
  }, [arriving, animationsOff]);

  useEffect(() => {
    if (hasLink && !curtainClosed && !arriving && document.activeElement === document.body) {
      stageHeading.current?.focus({ preventScroll: true });
    }
  }, [arriving, curtainClosed, hasLink]);

  useEffect(() => {
    if (state.status === 'success') {
      recipient.current?.focus({ preventScroll: true });
    }
  }, [state.status]);

  function toggleSound() {
    const nextMuted = soundBlocked ? false : !muted;

    setMuted(nextMuted);
    setSoundBlocked(false);
    if (hasLink && !curtainClosed) {
      soundtrack.current?.setMuted(nextMuted);
    }
  }

  function openCurtain() {
    const music = soundtrack.current;

    if (!curtainClosed || !music) {
      return;
    }

    // Start audio directly from the click, before the curtain moves.
    if (muted) {
      music.setMuted(true);
    }

    music.enter();
    setState({ status: animationsOff ? 'ready' : 'arrival' });
  }

  async function reveal() {
    const music = soundtrack.current;

    if (!music || (state.status !== 'ready' && state.status !== 'error')) {
      return;
    }

    setState({ status: 'opening' });
    setSoundBlocked(false);

    // Decrypt during the build-up so the result is ready for the reveal cue.
    const musicalDrop = new Promise<void>((resolve) => {
      music.reveal(resolve);
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

  let headingCopy: { heading: string; emphasis: string } = hasLink ? wording.ready : wording.link;

  if (opening) {
    headingCopy = wording.opening;
  }

  if (revealed) {
    headingCopy = wording.revealed;
  }

  return (
    <div
      className={`christmas-app ${animationsOff ? 'motion-paused' : ''} ${curtainClosed ? 'curtain-closed' : ''}`}
      style={
        {
          '--reveal-duration': `${DROP_SECONDS}s`,
          '--arrival-duration': `${SLEIGH_FLIGHT_MILLISECONDS}ms`,
        } as CSSProperties
      }
    >
      <div className="fairy-lights" aria-hidden="true">
        {Array.from({ length: 16 }, (_, index) => (
          <span key={index} />
        ))}
      </div>
      <Snow />
      <FestiveBackdrop />
      <header className="site-header">
        <Brand />
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

      <main className="experience" inert={curtainClosed}>
        <div className="heading-group" aria-hidden={curtainClosed || arriving || undefined}>
          <h2
            className={headingCopy === wording.ready ? 'invitation-heading' : undefined}
            ref={stageHeading}
            tabIndex={hasLink ? -1 : undefined}
          >
            {headingCopy.heading}
            <br />
            <em>{headingCopy.emphasis}</em>
          </h2>
          {opening && <p className="scene-description">{wording.opening.description}</p>}
        </div>

        <ChristmasScene
          arriving={arriving}
          letterDelivered={letterDelivered}
          opening={opening}
          revealed={revealed}
          onOpenLetter={reveal}
        >
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

      {hasLink && <StageCurtain closed={curtainClosed} onOpen={openCurtain} />}

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
