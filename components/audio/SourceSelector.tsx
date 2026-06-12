'use client';
import { useCallback, useRef, useState } from 'react';
import type { AudioSourceType } from '@/types/audio';

interface Props {
  onSource: (type: AudioSourceType, file?: File) => void;
  isActive: boolean;
  error: string | null;
}

const ACCEPTED = '.mp3,.wav,.flac,.aac,audio/*';

export function SourceSelector({ onSource, isActive, error }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [activeType, setActiveType] = useState<AudioSourceType | null>(null);

  const handleFile = useCallback((file: File) => {
    setActiveType('file');
    onSource('file', file);
  }, [onSource]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleMic = useCallback(() => {
    setActiveType('microphone');
    onSource('microphone');
  }, [onSource]);

  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-widest text-white/40 font-medium">Audio Source</p>

      {/* Upload drop zone */}
      <div
        className={`relative rounded-xl border-2 border-dashed p-5 text-center cursor-pointer transition-all duration-200
          ${dragOver ? 'border-purple-400 bg-purple-500/10' : 'border-white/15 hover:border-white/30'}
          ${activeType === 'file' && isActive ? 'border-purple-500 bg-purple-500/10' : ''}
        `}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        <div className="text-2xl mb-1">🎵</div>
        <p className="text-sm text-white/70 font-medium">Upload Audio</p>
        <p className="text-xs text-white/30 mt-0.5">MP3 · WAV · FLAC · AAC</p>
        {activeType === 'file' && isActive && (
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        )}
      </div>

      {/* Microphone */}
      <button
        onClick={handleMic}
        className={`relative w-full rounded-xl border p-3 text-left transition-all duration-200 cursor-pointer flex items-center gap-3
          ${activeType === 'microphone' && isActive
            ? 'border-cyan-500 bg-cyan-500/10 text-white'
            : 'border-white/15 hover:border-white/30 text-white/70 hover:text-white'
          }`}
      >
        <span className="text-xl">🎙️</span>
        <div>
          <p className="text-xs font-semibold">Microphone</p>
          <p className="text-[10px] text-white/40">Live input · Vocals · MC</p>
        </div>
        {activeType === 'microphone' && isActive && (
          <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        )}
      </button>

      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 rounded-lg p-2 border border-red-500/20">
          {error}
        </p>
      )}
    </div>
  );
}
