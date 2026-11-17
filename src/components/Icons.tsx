import type { ReactNode } from 'react';

type IconName = 'gift' | 'sound' | 'muted' | 'pause' | 'play' | 'arrow' | 'star';

export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    gift: (
      <>
        <path d="M3 10h18v4H3zM5 14v8h14v-8M12 10v12" />
        <path d="M12 10H8a3 3 0 1 1 3-3l1 3Zm0 0h4a3 3 0 1 0-3-3l-1 3Z" />
      </>
    ),
    sound: (
      <>
        <path d="m11 4-5 4H3v8h3l5 4V4Z" />
        <path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />
      </>
    ),
    muted: (
      <>
        <path d="m11 4-5 4H3v8h3l5 4V4Zm5 5 6 6m0-6-6 6" />
      </>
    ),
    pause: <path d="M8 5v14M16 5v14" />,
    play: <path d="m8 4 12 8-12 8V4Z" />,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    star: (
      <path d="m12 2 2.8 6.4 7 .7-5.2 4.6 1.5 6.9-6.1-3.5-6.1 3.5 1.5-6.9L2.2 9.1l7-.7L12 2Z" />
    ),
  };

  return (
    <svg
      className={`icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
