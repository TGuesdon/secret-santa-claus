import type { CSSProperties } from 'react';
import { Icon } from './Icons';
import './FestiveBackdrop.css';

const giftPositions = [
  { x: 6, y: 24, size: 46, duration: 9, driftX: 80, driftY: -135, spin: 320 },
  { x: 90, y: 18, size: 36, duration: 11, driftX: -95, driftY: 155, spin: -350 },
  { x: 12, y: 63, size: 32, duration: 8, driftX: -50, driftY: -170, spin: -290 },
  { x: 85, y: 71, size: 52, duration: 12, driftX: 65, driftY: -120, spin: 380 },
  { x: 24, y: 88, size: 38, duration: 10, driftX: 110, driftY: -90, spin: 310 },
  { x: 73, y: 36, size: 30, duration: 7, driftX: 90, driftY: 125, spin: -330 },
];

export function FestiveBackdrop() {
  return (
    <div className="festive-backdrop" aria-hidden="true">
      <div className="floating-gifts">
        {giftPositions.map((gift, index) => (
          <span
            key={index}
            style={
              {
                '--x': `${gift.x}%`,
                '--y': `${gift.y}%`,
                '--size': `${gift.size}px`,
                '--duration': `${gift.duration}s`,
                '--delay': `${-index * 4.3}s`,
                '--drift-x': `${gift.driftX}px`,
                '--drift-y': `${gift.driftY}px`,
                '--spin': `${gift.spin}deg`,
              } as CSSProperties
            }
          >
            <Icon name="gift" />
          </span>
        ))}
      </div>
      <div className="sky-stars">
        {Array.from({ length: 18 }, (_, index) => (
          <span
            key={index}
            className="sky-star"
            style={
              {
                left: `${(index * 37 + 3) % 100}%`,
                top: `${(index * 29 + 8) % 100}%`,
                '--star-size': `${8 + (index % 4) * 3}px`,
                '--star-delay': `${index * -0.6}s`,
              } as CSSProperties
            }
          >
            <Icon name="star" />
          </span>
        ))}
      </div>
    </div>
  );
}
