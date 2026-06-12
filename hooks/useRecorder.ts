'use client';
import { useCallback, useRef, useState } from 'react';

export interface RecorderState {
  isRecording: boolean;
  isPaused: boolean;
  durationMs: number;
}

export function useRecorder(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [state, setState] = useState<RecorderState>({
    isRecording: false,
    isPaused: false,
    durationMs: 0,
  });

  const start = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const stream = canvas.captureStream(60);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.start(100);
    mediaRecorderRef.current = recorder;

    let elapsed = 0;
    timerRef.current = setInterval(() => {
      elapsed += 100;
      setState((s) => ({ ...s, durationMs: elapsed }));
    }, 100);

    setState({ isRecording: true, isPaused: false, durationMs: 0 });
  }, [canvasRef]);

  const pause = useCallback(() => {
    mediaRecorderRef.current?.pause();
    if (timerRef.current) clearInterval(timerRef.current);
    setState((s) => ({ ...s, isPaused: true }));
  }, []);

  const resume = useCallback(() => {
    mediaRecorderRef.current?.resume();
    timerRef.current = setInterval(() => {
      setState((s) => ({ ...s, durationMs: s.durationMs + 100 }));
    }, 100);
    setState((s) => ({ ...s, isPaused: false }));
  }, []);

  const stop = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder) return;

      if (timerRef.current) clearInterval(timerRef.current);

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        chunksRef.current = [];
        setState({ isRecording: false, isPaused: false, durationMs: 0 });
        resolve(blob);
      };
      recorder.stop();
    });
  }, []);

  const download = useCallback(async (filename = 'pacemaker-recording') => {
    const blob = await stop();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  }, [stop]);

  return { state, start, pause, resume, stop, download };
}
