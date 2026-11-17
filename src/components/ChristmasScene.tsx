import type { CSSProperties, ReactNode } from 'react';
import friends from '../assets/christmas-friends.webp';
import santa from '../assets/santa.webp';
import { Icon } from './Icons';

type SceneProps = {
  opening: boolean;
  revealed: boolean;
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

export function ChristmasScene({ opening, revealed, children }: SceneProps) {
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
        <img src={friends} alt="" width="1536" height="1024" fetchPriority="high" />
      </div>
      <img
        className="santa-illustration"
        src={santa}
        alt=""
        width="512"
        height="512"
        aria-hidden="true"
      />
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
      <div className="present" aria-hidden="true">
        <div className="present-shadow" />
        <div className="present-parcel">
          <div className="present-body">
            <span className="present-ribbon" />
          </div>
          <div className="present-lid">
            <span className="bow bow-left" />
            <span className="bow bow-right" />
            <span className="bow-knot" />
            <span className="lid-ribbon" />
          </div>
          <span className="gift-tag">Pour toi</span>
        </div>
      </div>
      {revealed && (
        <div className="confetti" aria-hidden="true">
          {Array.from({ length: 30 }, (_, index) => (
            <i
              key={index}
              style={
                {
                  '--angle': `${index * 12}deg`,
                  '--travel': `${160 + (index % 5) * 33}px`,
                  '--delay': `${(index % 4) * 0.035}s`,
                  '--confetti-color': ['#b92f3b', '#e5ba69', '#346552', '#fff6df'][index % 4],
                } as CSSProperties
              }
            />
          ))}
        </div>
      )}
      {children}
    </div>
  );
}
