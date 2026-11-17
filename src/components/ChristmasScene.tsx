import type { CSSProperties, ReactNode } from 'react';
import { useLayoutEffect, useRef } from 'react';
import friends from '../assets/christmas-friends.webp';
import friendsSmall from '../assets/christmas-friends-640.webp';
import friendsMedium from '../assets/christmas-friends-1024.webp';
import santa from '../assets/santa.webp';
import santaSmall from '../assets/santa-256.webp';
import { wording } from '../locales/fr';
import { Icon } from './Icons';

type SceneProps = {
  arriving: boolean;
  letterDelivered: boolean;
  opening: boolean;
  revealed: boolean;
  onOpenLetter: () => void;
  children?: ReactNode;
};

const starPositions = [
  { x: 8, y: 14, size: 22 },
  { x: 19, y: 53, size: 16 },
  { x: 25, y: 5, size: 32 },
  { x: 33, y: 36, size: 18 },
  { x: 13, y: 77, size: 24 },
  { x: 67, y: 9, size: 24 },
  { x: 78, y: 37, size: 18 },
  { x: 89, y: 16, size: 30 },
  { x: 72, y: 73, size: 22 },
  { x: 91, y: 68, size: 16 },
];

const confettiBursts = [
  { x: 50, y: 42, delay: 0, pieces: 30, firstAngle: 0, angleStep: 12, distance: 160 },
  { x: 19, y: 76, delay: 280, pieces: 16, firstAngle: -66, angleStep: 5, distance: 118 },
  { x: 81, y: 74, delay: 610, pieces: 16, firstAngle: -9, angleStep: 5, distance: 118 },
  { x: 50, y: 32, delay: 1220, pieces: 44, firstAngle: 4, angleStep: 360 / 44, distance: 220 },
];

export function Snow() {
  return (
    <div className="snow" aria-hidden="true">
      {Array.from({ length: 28 }, (_, index) => (
        <span
          key={index}
          style={
            {
              '--x': `${(index * 37 + 7) % 100}%`,
              '--delay': `${-index * 0.71}s`,
              '--duration': `${12 + (index % 6) * 2}s`,
              '--size': `${3 + (index % 3) * 2}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

function SantaSleigh() {
  const runwayRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const runway = runwayRef.current;

    if (!runway) {
      return;
    }

    const measureViewportOffset = () => {
      const bottom = runway.getBoundingClientRect().bottom;

      runway.style.setProperty('--sleigh-viewport-offset', `${bottom}px`);
    };

    // Start at the viewport corner and keep the delivery anchored to the scene.
    measureViewportOffset();
    window.addEventListener('resize', measureViewportOffset);

    return () => window.removeEventListener('resize', measureViewportOffset);
  }, []);

  return (
    <div className="sleigh-runway" ref={runwayRef} aria-hidden="true">
      <div className="sleigh-flight">
        <div className="sleigh">
          <img
            className="sleigh-santa"
            src={santa}
            srcSet={`${santaSmall} 256w, ${santa} 512w`}
            sizes="(max-width: 700px) 125px, 235px"
            alt=""
            width="512"
            height="512"
          />
          <span className="sleigh-mail" />
          <span className="sleigh-runner" />
          <span className="sleigh-body" />
        </div>
      </div>
    </div>
  );
}

function Envelope({ caption }: { caption?: string }) {
  return (
    <span className="envelope">
      <span className="envelope-flap" />
      <span className="envelope-seal" aria-hidden="true" />
      {caption && <span className="envelope-caption">{caption}</span>}
    </span>
  );
}

export function ChristmasScene({
  arriving,
  letterDelivered,
  opening,
  revealed,
  onOpenLetter,
  children,
}: SceneProps) {
  let stateClass = '';

  if (opening) {
    stateClass = 'is-opening';
  }

  if (revealed) {
    stateClass = 'is-revealed';
  }

  return (
    <div className={`christmas-scene ${stateClass}`}>
      <div className="scene-illustration" aria-hidden="true">
        <img
          src={friendsMedium}
          srcSet={`${friendsSmall} 640w, ${friendsMedium} 1024w, ${friends} 1536w`}
          sizes="(max-width: 700px) 112vw, (max-width: 1048px) calc(100vw - 48px), 1000px"
          alt=""
          width="1536"
          height="1024"
          fetchPriority="high"
        />
      </div>
      <div className="stage-stars" aria-hidden="true">
        {starPositions.map((star, index) => (
          <span
            key={index}
            className="stage-star"
            style={
              {
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: star.size,
                height: star.size,
                '--star-delay': `${index * -0.45}s`,
              } as CSSProperties
            }
          >
            <Icon name="star" className="star" />
          </span>
        ))}
      </div>
      {arriving && (
        <>
          <SantaSleigh />
          <div className="letter-delivery letter-drop" aria-hidden="true">
            <Envelope />
          </div>
        </>
      )}
      {letterDelivered && (
        <div className="letter-delivery">
          {children}
          {revealed ? (
            <div className="opened-envelope" aria-hidden="true">
              <Envelope />
            </div>
          ) : (
            <button
              className="letter-button"
              type="button"
              aria-disabled={opening}
              onClick={onOpenLetter}
            >
              <Envelope caption={opening ? wording.opening.action : wording.ready.action} />
            </button>
          )}
        </div>
      )}
      {revealed &&
        confettiBursts.map((burst) => (
          <div
            key={burst.delay}
            className="confetti"
            aria-hidden="true"
            style={{ '--burst-x': `${burst.x}%`, '--burst-y': `${burst.y}%` } as CSSProperties}
          >
            {Array.from({ length: burst.pieces }, (_, index) => (
              <i
                key={index}
                style={
                  {
                    '--angle': `${burst.firstAngle + index * burst.angleStep}deg`,
                    '--travel': `${burst.distance + (index % 5) * 33}px`,
                    '--delay': `${burst.delay + (index % 4) * 35}ms`,
                    '--confetti-color': ['#b92f3b', '#e5ba69', '#346552', '#fff6df'][index % 4],
                  } as CSSProperties
                }
              />
            ))}
          </div>
        ))}
    </div>
  );
}
