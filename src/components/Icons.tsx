import type { ReactNode } from 'react';

type IconName =
  | 'gift'
  | 'sound'
  | 'muted'
  | 'pause'
  | 'play'
  | 'arrow'
  | 'star'
  | 'plus'
  | 'trash'
  | 'close'
  | 'check'
  | 'copy'
  | 'download'
  | 'upload'
  | 'people';

export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    plus: <path d="M12 5v14M5 12h14" />,
    trash: <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    check: <path d="m5 12 4 4L19 6" />,
    copy: <path d="M9 9h12v12H9zM15 9V3H3v12h6" />,
    download: <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />,
    upload: <path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5" />,
    people: (
      <>
        <circle cx="9" cy="7" r="3" />
        <path d="M3 21v-3a6 6 0 0 1 12 0v3M17 4a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 5v2" />
      </>
    ),
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
