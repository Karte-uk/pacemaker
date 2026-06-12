'use client';
import { useRef } from 'react';
import { useRecorder } from '@/hooks/useRecorder';

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m.toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

interface Props {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export function RecordingControls({ canvasRef }: Props) {
  const { state, start, pause, resume, download } = useRecorder(canvasRef);
  const { isRecording, isPaused, durationMs } = state;

  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-widest text-white/40 font-medium">Recording</p>

      <div className="flex items-center gap-2">
        {!isRecording ? (
          <button
            onClick={start}
            className="flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-4 py-2 transition-all cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-white" />
            Record
          </button>
        ) : (
          <>
            <button
              onClick={isPaused ? resume : pause}
              className="flex items-center gap-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold px-3 py-2 transition-all cursor-pointer"
            >
              {isPaused ? '▶ Resume' : '⏸ Pause'}
            </button>
            <button
              onClick={() => download()}
              className="flex items-center gap-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-semibold px-3 py-2 transition-all cursor-pointer"
            >
              ⏹ Save
            </button>
            <div className="flex items-center gap-1.5 ml-auto">
              {!isPaused && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
              <span className="text-xs font-mono text-white/60">{formatDuration(durationMs)}</span>
            </div>
          </>
        )}
      </div>

      <p className="text-[10px] text-white/25">Exports as WebM · Use HandBrake to convert to MP4</p>
    </div>
  );
}
