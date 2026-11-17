// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Soundtrack } from '../src/lib/soundtrack';

let tracks: HTMLAudioElement[];

beforeEach(() => {
  vi.useFakeTimers();
  tracks = [];

  vi.stubGlobal('Audio', function () {
    const track = document.createElement('audio');

    track.play = vi.fn(async () => {});
    track.pause = vi.fn();
    tracks.push(track);

    return track;
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('requests audible intro autoplay instead of starting silently and raising the volume', () => {
  const soundtrack = new Soundtrack();
  let requestedVolume = 0;

  tracks[0].play = vi.fn(async () => {
    requestedVolume = tracks[0].volume;
  });
  soundtrack.enter();

  // Firefox rechecks autoplay permission when silent playback becomes audible.
  expect(requestedVolume).toBe(0.55);
  soundtrack.dispose();
});

it('reports denied audible autoplay and retries on one explicit activation', async () => {
  const onBlocked = vi.fn();
  const soundtrack = new Soundtrack(onBlocked);

  tracks[0].play = vi
    .fn()
    .mockRejectedValueOnce(new DOMException('Autoplay blocked', 'NotAllowedError'))
    .mockResolvedValue(undefined);
  soundtrack.enter();
  await vi.advanceTimersByTimeAsync(0);
  expect(onBlocked).toHaveBeenCalledOnce();

  soundtrack.setMuted(false);
  await vi.advanceTimersByTimeAsync(500);
  expect(tracks[0].play).toHaveBeenCalledTimes(2);
  expect(tracks[0].volume).toBe(0.55);
  expect(onBlocked).toHaveBeenCalledOnce();
  soundtrack.dispose();
});

it('uses the jingle position to time the reveal', async () => {
  const soundtrack = new Soundtrack();
  const onDrop = vi.fn();

  soundtrack.enter();
  soundtrack.reveal(onDrop);
  tracks[1].currentTime = 6.45;
  await vi.advanceTimersByTimeAsync(500);
  expect(onDrop).not.toHaveBeenCalled();

  tracks[1].currentTime = 6.5;
  await vi.advanceTimersByTimeAsync(100);
  expect(onDrop).toHaveBeenCalledOnce();
  soundtrack.dispose();
  expect(vi.getTimerCount()).toBe(0);
});

it('reveals after 6.5 seconds when sound playback is unavailable', async () => {
  const soundtrack = new Soundtrack();
  const onDrop = vi.fn();

  tracks[1].play = vi.fn(async () => {
    throw new Error('Playback blocked');
  });
  soundtrack.reveal(onDrop);
  await vi.advanceTimersByTimeAsync(6450);
  expect(onDrop).not.toHaveBeenCalled();

  await vi.advanceTimersByTimeAsync(50);
  expect(onDrop).toHaveBeenCalledOnce();
  soundtrack.dispose();
});

it('cancels obsolete reveals and stops both tracks on disposal', async () => {
  const soundtrack = new Soundtrack();
  const onDrop = vi.fn();

  soundtrack.enter();
  soundtrack.reveal(onDrop);
  soundtrack.dispose();
  await vi.advanceTimersByTimeAsync(10000);
  expect(onDrop).not.toHaveBeenCalled();
  expect(tracks.every((track) => vi.mocked(track.pause).mock.calls.length > 0)).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
});

it('fades music out before pausing when sound is disabled', async () => {
  const soundtrack = new Soundtrack();

  soundtrack.enter();
  await vi.advanceTimersByTimeAsync(500);
  soundtrack.setMuted(true);
  await vi.advanceTimersByTimeAsync(600);
  expect(tracks[0].volume).toBe(0);
  expect(tracks[0].pause).toHaveBeenCalled();
  soundtrack.dispose();
});
