export class IntroLoop {
  private readonly media: HTMLAudioElement;
  private useMedia = typeof AudioContext !== 'function';
  private context?: AudioContext;
  private gain?: GainNode;
  private buffer?: Promise<AudioBuffer>;
  private level = 0;
  private playRequest = 0;

  constructor(private readonly url: string) {
    this.media = new Audio(url);
    this.media.loop = true;
    this.media.preload = 'none';
    this.media.volume = this.level;
  }

  get volume() {
    return this.level;
  }

  set volume(level: number) {
    this.level = level;
    if (this.gain) {
      this.gain.gain.value = level;
    }

    this.media.volume = level;
  }

  async play() {
    if (this.useMedia) {
      return this.media.play();
    }

    const request = ++this.playRequest;

    try {
      const context = (this.context ??= this.createContext());

      // Unlock audio during the curtain click, before loading the file.
      const resumed = context.resume();

      this.buffer ??= this.decode(context);
      const [, buffer] = await Promise.all([resumed, this.buffer]);

      if (request !== this.playRequest || this.gain) {
        return;
      }

      const gain = context.createGain();

      gain.gain.value = this.level;
      gain.connect(context.destination);

      // A decoded buffer loops at the audio render clock, without media seeking.
      const source = context.createBufferSource();

      source.buffer = buffer;
      source.loop = true;
      source.connect(gain);
      source.start();
      this.gain = gain;
    } catch {
      if (request !== this.playRequest) {
        return;
      }

      this.useMedia = true;
      this.closeContext();
      await this.media.play();
    }
  }

  cancelPendingPlay() {
    this.playRequest += 1;
  }

  pause() {
    this.cancelPendingPlay();
    if (this.useMedia) {
      this.media.pause();

      return;
    }

    void this.context?.suspend().catch(() => {});
  }

  dispose() {
    this.cancelPendingPlay();
    this.media.pause();
    this.closeContext();
  }

  private createContext() {
    const { audioSession } = navigator as Navigator & { audioSession?: { type: string } };

    if (audioSession) {
      // Use media playback routing so iOS can play the intro in silent mode.
      audioSession.type = 'playback';
    }

    return new AudioContext();
  }

  private async decode(context: AudioContext) {
    const response = await fetch(this.url);

    if (!response.ok) {
      throw new Error('Unable to load the intro loop');
    }

    const file = await response.arrayBuffer();

    return context.decodeAudioData(file);
  }

  private closeContext() {
    void this.context?.close().catch(() => {});
    this.context = undefined;
    this.gain = undefined;
    this.buffer = undefined;
  }
}
