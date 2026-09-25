'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import script from './narration.json';
import { slides } from './content';

export type NarrationStep = {
  id: string;
  slideId: string;
  kind: string;
  src?: string;
  text?: string;
  reveal?: boolean;
  duration?: number;
  pauseAfterMs?: number;
  available?: boolean;
};
const sequence: NarrationStep[] = script;
const audioSpeeds = [0.75, 1, 1.25, 1.5, 1.75, 2];

export function useAutoplay({ root, go, reveal, notify }: {
  root: RefObject<HTMLDivElement | null>;
  go: (index: number) => void;
  reveal: (shown: boolean) => void;
  notify: (message: string) => void;
}) {
  const [status, setStatus] = useState<'idle' | 'playing' | 'paused'>('idle');
  const [caption, setCaption] = useState('');
  const [audioSpeed, setAudioSpeed] = useState(1);
  const speed = useRef(1);
  const run = useRef(0);
  const active = useRef(false);
  const paused = useRef(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const current = useRef<HTMLMediaElement | null>(null);
  const stepIndex = useRef(0);
  const expectedSlide = useRef('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frame = useRef<number | null>(null);
  const cleanup = useRef<(() => void) | null>(null);
  const waiting = useRef(false);
  const remaining = useRef(0);
  const due = useRef(0);
  const launch = useRef<(index: number, token: number) => void>(() => {});

  const cycleAudioSpeed = useCallback(() => {
    const next = audioSpeeds[(audioSpeeds.indexOf(speed.current) + 1) % audioSpeeds.length];
    speed.current = next;
    setAudioSpeed(next);
    // Only narration is affected, including while a video is playing.
    if (audio.current) audio.current.playbackRate = next;
  }, []);

  const cancelTimer = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const stop = useCallback(() => {
    run.current += 1;
    active.current = false;
    paused.current = false;
    waiting.current = false;
    cancelTimer();
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    cleanup.current?.();
    cleanup.current = null;
    current.current?.pause();
    current.current = null;
    setStatus('idle');
    setCaption('');
  }, [cancelTimer]);

  const scheduleNext = useCallback((token: number, delay: number) => {
    cancelTimer();
    remaining.current = delay;
    due.current = Date.now() + delay;
    timer.current = setTimeout(() => {
      timer.current = null;
      if (!active.current || token !== run.current || paused.current) return;
      waiting.current = false;
      launch.current(stepIndex.current + 1, token);
    }, delay);
  }, [cancelTimer]);

  useEffect(() => {
    launch.current = (position, token) => {
      if (!active.current || token !== run.current) return;
      cleanup.current?.();
      cleanup.current = null;
      if (position >= sequence.length) { stop(); return; }
      const step = sequence[position];
      stepIndex.current = position;
      expectedSlide.current = step.slideId;
      go(slides.findIndex(slide => slide.id === step.slideId));
      reveal(Boolean(step.reveal));
      if (step.available === false) {
        stop();
        notify('Narration for this slide is still being prepared. Please continue manually.');
        return;
      }
      setCaption(step.kind === 'video' ? 'Playing the app demo' : 'Playing audio');

      const attach = (element: HTMLMediaElement) => {
        if (!active.current || token !== run.current) return;
        current.current = element;
        if (step.kind === 'audio') {
          element.src = step.src!;
          element.playbackRate = speed.current;
          element.preservesPitch = true;
        } else {
          element.currentTime = 0;
          element.playbackRate = 1;
        }
        const onEnded = () => {
          if (token !== run.current) return;
          waiting.current = true;
          scheduleNext(token, step.pauseAfterMs ?? 800);
        };
        const onPause = () => {
          if (token !== run.current || element.ended || waiting.current) return;
          paused.current = true;
          setStatus('paused');
        };
        const onPlay = () => {
          if (token !== run.current) return;
          paused.current = false;
          setStatus('playing');
        };
        const onError = () => {
          if (token !== run.current) return;
          stop();
          notify('This recording could not be loaded. You can continue manually or try Autoplay again.');
        };
        element.addEventListener('ended', onEnded);
        element.addEventListener('pause', onPause);
        element.addEventListener('play', onPlay);
        element.addEventListener('error', onError);
        cleanup.current = () => {
          element.removeEventListener('ended', onEnded);
          element.removeEventListener('pause', onPause);
          element.removeEventListener('play', onPlay);
          element.removeEventListener('error', onError);
        };
        if (paused.current) return;
        void element.play().catch(() => {
          if (token !== run.current || !active.current) return;
          paused.current = true;
          setStatus('paused');
          notify('Playback paused. Press Resume to allow the next recording to play.');
        });
      };

      if (step.kind === 'audio') {
        audio.current ??= new Audio();
        attach(audio.current);
      } else {
        // The demo intro normally mounts the video first. Also handle starting
        // from a deep link while React is still rendering the slide.
        const deadline = Date.now() + 5000;
        const findVideo = () => {
          if (!active.current || token !== run.current) return;
          const element = root.current?.querySelector('video');
          if (element) { attach(element); return; }
          if (Date.now() > deadline) {
            stop();
            notify('The demo could not be started. You can play it manually and continue.');
            return;
          }
          frame.current = requestAnimationFrame(findVideo);
        };
        findVideo();
      }
    };
  }, [go, notify, reveal, root, scheduleNext, stop]);

  const start = useCallback((slideId: string) => {
    stop();
    const position = sequence.findIndex(step => step.slideId === slideId);
    if (position < 0) { notify('Narration is not available for this slide yet.'); return; }
    root.current?.querySelector('video')?.pause();
    active.current = true;
    setStatus('playing');
    notify('');
    launch.current(position, run.current);
  }, [notify, root, stop]);

  const pause = useCallback(() => {
    if (!active.current) return;
    paused.current = true;
    if (waiting.current) {
      remaining.current = Math.max(0, due.current - Date.now());
      cancelTimer();
    }
    current.current?.pause();
    setStatus('paused');
  }, [cancelTimer]);

  const resume = useCallback(() => {
    if (!active.current) return;
    paused.current = false;
    setStatus('playing');
    notify('');
    if (waiting.current) { scheduleNext(run.current, remaining.current); return; }
    const token = run.current;
    const element = current.current;
    if (element?.error) element.load();
    void element?.play().catch(() => {
      if (token !== run.current) return;
      paused.current = true;
      setStatus('paused');
      notify('Playback is unavailable. Try stopping and starting Autoplay again.');
    });
  }, [notify, scheduleNext]);

  useEffect(() => {
    const onHashChange = () => {
      if (active.current && window.location.hash.slice(1) !== expectedSlide.current) stop();
    };
    const onPageHide = () => stop();
    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('pagehide', onPageHide);
      stop();
      audio.current?.removeAttribute('src');
      audio.current?.load();
    };
  }, [stop]);

  return { status, caption, start, stop, pause, resume, audioSpeed, cycleAudioSpeed };
}
