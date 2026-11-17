import { IntroLoop } from './intro-loop';

export const DROP_SECONDS = 6.5;
const MUSIC_VOLUME = 0.55;
const FADE_MILLISECONDS = 450;

type Fade = {
  from: number;
  to: number;
  startedAt: number;
  pauseAfter: boolean;
};

type Track = Pick<HTMLAudioElement, 'play' | 'pause' | 'volume'>;

/** Owns playback and its clock; React only receives the musical drop. */
export class Soundtrack {
  private readonly intro = new IntroLoop(`${import.meta.env.BASE_URL}intro_loop.mp3`);
  private readonly jingle = new Audio(`${import.meta.env.BASE_URL}jingle_bell.mp3`);
  private readonly fades = new Map<Track, Fade>();
  private active: Track = this.intro;
  private timer: ReturnType<typeof setInterval> | undefined;
  private muted = false;
  private disposed = false;
  private playbackAvailable = true;
  private drop: (() => void) | undefined;
  private startedAt = 0;
  private lastProgressAt = 0;
  private lastPosition = 0;

  constructor(private readonly onPlaybackBlocked: () => void = () => {}) {
    this.jingle.loop = true;
    this.jingle.preload = 'none';
    this.jingle.volume = 0;
  }

  enter() {
    this.active = this.intro;

    // Firefox can pause silent autoplay when a later fade makes it audible.
    // Request audible playback upfront so denial reaches the existing fallback.
    if (!this.muted) {
      this.intro.volume = MUSIC_VOLUME;
    }

    this.startClock();
    this.play(this.intro);
  }

  reveal(onDrop: () => void) {
    this.fade(this.intro, 0, true);
    this.active = this.jingle;
    this.jingle.currentTime = 0;
    this.drop = onDrop;
    this.startedAt = performance.now();
    this.lastProgressAt = this.startedAt;
    this.lastPosition = 0;
    this.startClock();
    this.play(this.jingle);
  }

  retry() {
    this.drop = undefined;
    this.fade(this.jingle, 0, true);
    this.enter();
  }

  setMuted(muted: boolean) {
    this.muted = muted;

    if (muted) {
      this.fade(this.intro, 0, true);
      this.fade(this.jingle, 0, true);
    } else {
      this.play(this.active);
    }
  }

  dispose() {
    this.disposed = true;
    this.drop = undefined;
    clearInterval(this.timer);
    this.fades.clear();
    this.intro.dispose();
    this.jingle.pause();
  }

  private startClock() {
    if (!this.timer) {
      this.timer = setInterval(() => this.tick(), 50);
    }
  }

  private play(track: Track) {
    if (this.muted || this.disposed) {
      return;
    }

    this.playbackAvailable = true;
    this.fade(track, MUSIC_VOLUME);

    // Call play directly from the click, before awaiting any network work.
    void track.play().catch(() => {
      if (!this.disposed && !this.muted && track === this.active) {
        this.playbackAvailable = false;
        this.onPlaybackBlocked();
      }
    });
  }

  private fade(track: Track, to: number, pauseAfter = false) {
    if (track === this.intro && pauseAfter) {
      // The intro may still be decoding when the user opens the letter.
      this.intro.cancelPendingPlay();
    }

    this.fades.set(track, {
      from: track.volume,
      to,
      startedAt: performance.now(),
      pauseAfter,
    });
  }

  private tick() {
    const now = performance.now();

    for (const [track, fade] of this.fades) {
      const progress = Math.min(1, (now - fade.startedAt) / FADE_MILLISECONDS);

      track.volume = fade.from + (fade.to - fade.from) * progress;

      if (progress === 1) {
        this.fades.delete(track);

        if (fade.pauseAfter) {
          track.pause();
        }
      }
    }

    // Soften the end of every jingle loop without changing the original file.
    if (this.active === this.jingle && !this.muted && !this.fades.has(this.jingle)) {
      const remaining = this.jingle.duration - this.jingle.currentTime;
      const endingGain = Number.isFinite(remaining) ? Math.min(1, remaining / 1.4) : 1;

      this.jingle.volume = MUSIC_VOLUME * Math.max(0, endingGain);
    }

    if (!this.drop) {
      return;
    }

    const position = this.jingle.currentTime;

    if (position > this.lastPosition) {
      this.lastPosition = position;
      this.lastProgressAt = now;
    }

    let elapsed = (now - this.startedAt) / 1000;

    if (this.lastPosition > 0 && this.playbackAvailable && !this.muted) {
      elapsed = position;

      // Broken or stalled audio must never hold the private result hostage.
      if (now - this.lastProgressAt > 2000) {
        elapsed += (now - this.lastProgressAt) / 1000;
      }
    }

    if (elapsed >= DROP_SECONDS) {
      const onDrop = this.drop;

      this.drop = undefined;
      onDrop();
    }
  }
}
