'use client';
import { useState, useCallback } from 'react';
import type { SpotifyTrackData } from '@/lib/spotify/types';
import { moodToPreset } from '@/lib/spotify/types';

interface Props {
  onTrackLoaded: (data: SpotifyTrackData) => void;
  onActivateSystemAudio: () => void;
}

type Status = 'idle' | 'loading' | 'loaded' | 'error' | 'not-configured';

const PRESETS_BG: Record<string, { primary: string; secondary: string; bg: string }> = {
  Neon:   { primary: '#a855f7', secondary: '#06b6d4', bg: '#000000' },
  Fire:   { primary: '#f97316', secondary: '#ef4444', bg: '#0a0000' },
  Ocean:  { primary: '#06b6d4', secondary: '#3b82f6', bg: '#000a10' },
  Pink:   { primary: '#ec4899', secondary: '#f43f5e', bg: '#0a0005' },
  Tunnel: { primary: '#7c3aed', secondary: '#1d4ed8', bg: '#00000a' },
};

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

export function SpotifyInput({ onTrackLoaded, onActivateSystemAudio }: Props) {
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [track, setTrack] = useState<SpotifyTrackData | null>(null);
  const [error, setError] = useState('');

  const handleLoad = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setStatus('loading');
    setError('');
    try {
      const res = await fetch(`/api/spotify/track?url=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok) {
        const msg: string = data.error ?? 'Failed to load track';
        if (msg.toLowerCase().includes('client_id') || msg.toLowerCase().includes('credentials')) {
          setStatus('not-configured');
          return;
        }
        throw new Error(msg);
      }
      setTrack(data as SpotifyTrackData);
      setStatus('loaded');
      onTrackLoaded(data as SpotifyTrackData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load track');
      setStatus('error');
    }
  }, [onTrackLoaded]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted.includes('spotify')) {
      setInput(pasted);
      setTimeout(() => handleLoad(pasted), 0);
    }
  }, [handleLoad]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLoad(input);
  }, [input, handleLoad]);

  const suggestedPreset = track?.features
    ? moodToPreset(track.features.energy, track.features.valence)
    : null;
  const suggestedColors = suggestedPreset ? PRESETS_BG[suggestedPreset] : null;

  // ── Setup guide shown when credentials are missing ─────────────────────────
  if (status === 'not-configured') {
    return (
      <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3 space-y-2.5">
        <div className="flex items-center gap-2">
          <SpotifyIcon />
          <p className="text-xs font-semibold text-yellow-300">Spotify API not set up</p>
        </div>
        <ol className="space-y-1.5 text-[11px] text-white/50 list-none">
          <li className="flex gap-2"><span className="text-yellow-500/70 font-bold">1.</span>Go to developer.spotify.com/dashboard</li>
          <li className="flex gap-2"><span className="text-yellow-500/70 font-bold">2.</span>Create an app → copy Client ID &amp; Secret</li>
          <li className="flex gap-2"><span className="text-yellow-500/70 font-bold">3.</span>Create <code className="text-white/70">.env.local</code> in the project root</li>
          <li className="flex gap-2"><span className="text-yellow-500/70 font-bold">4.</span>
            <span>Add:<br/>
              <code className="text-green-400/80">SPOTIFY_CLIENT_ID=...</code><br/>
              <code className="text-green-400/80">SPOTIFY_CLIENT_SECRET=...</code>
            </span>
          </li>
          <li className="flex gap-2"><span className="text-yellow-500/70 font-bold">5.</span>Restart <code className="text-white/70">npm run dev</code></li>
        </ol>
        <button
          onClick={() => setStatus('idle')}
          className="text-[10px] text-white/30 hover:text-white/50 underline cursor-pointer"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Input */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-green-400">
          <SpotifyIcon />
        </div>
        <input
          type="text"
          value={input}
          placeholder="Paste Spotify link or URI…"
          className="w-full bg-white/5 border border-white/10 hover:border-green-500/40 focus:border-green-500/70 rounded-xl pl-9 pr-8 py-2.5 text-xs text-white placeholder-white/25 outline-none transition-all"
          onChange={(e) => setInput(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
        />
        {status === 'loading' && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-3 h-3 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
          </div>
        )}
        {status === 'loaded' && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400 text-xs">✓</div>
        )}
      </div>

      {status === 'error' && (
        <p className="text-[11px] text-red-400 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">
          {error}
        </p>
      )}

      {/* Track card */}
      {track && status === 'loaded' && (
        <div className="rounded-xl border border-white/8 overflow-hidden bg-white/3">
          <div className="flex gap-3 p-3">
            {track.track.albumArt && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={track.track.albumArt} alt={track.track.album} className="w-14 h-14 rounded-lg flex-shrink-0 object-cover" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{track.track.name}</p>
              <p className="text-[11px] text-white/50 truncate">{track.track.artist}</p>
              <p className="text-[10px] text-white/30 truncate">{track.track.album}</p>
              <p className="text-[10px] text-white/25 mt-0.5">{formatDuration(track.track.durationMs)}</p>
            </div>
          </div>

          {track.features ? (
            <div className="px-3 pb-3 grid grid-cols-4 gap-1.5">
              <FeaturePill label="BPM" value={String(track.features.bpm)} accent />
              <FeaturePill label="Energy" value={`${Math.round(track.features.energy * 100)}%`} />
              <FeaturePill label="Dance" value={`${Math.round(track.features.danceability * 100)}%`} />
              <FeaturePill label="Vibe" value={`${Math.round(track.features.valence * 100)}%`} />
            </div>
          ) : (
            <p className="px-3 pb-2.5 text-[10px] text-white/25">
              Audio analysis unavailable · BPM detected live
            </p>
          )}

          {suggestedColors && (
            <div className="px-3 pb-3">
              <p className="text-[10px] text-white/30 mb-1.5">AI mood → suggested palette</p>
              <button
                onClick={() => onTrackLoaded({ ...track })}
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] font-medium text-white border border-white/10 hover:border-white/25 transition-all cursor-pointer"
                style={{ background: `linear-gradient(135deg, ${suggestedColors.primary}22, ${suggestedColors.secondary}22)` }}
              >
                <div className="w-3 h-3 rounded-full" style={{ background: `linear-gradient(135deg, ${suggestedColors.primary}, ${suggestedColors.secondary})` }} />
                Apply <span className="text-white/50 ml-1">{suggestedPreset}</span> palette
              </button>
            </div>
          )}

          <div className="px-3 pb-3 border-t border-white/5 pt-2.5">
            <button
              onClick={onActivateSystemAudio}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-green-600/15 hover:bg-green-600/25 border border-green-500/20 hover:border-green-500/40 text-green-400 text-xs font-semibold py-2 transition-all cursor-pointer"
            >
              <SpotifyIcon />
              Play in Spotify → Capture audio
            </button>
            <p className="text-[9px] text-white/20 text-center mt-1.5">Play in Spotify, then click above to capture system audio</p>
          </div>
        </div>
      )}
    </div>
  );
}

function FeaturePill({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg px-2 py-1.5 text-center ${accent ? 'bg-green-500/15 border border-green-500/20' : 'bg-white/5'}`}>
      <p className={`text-[11px] font-bold ${accent ? 'text-green-400' : 'text-white/70'}`}>{value}</p>
      <p className="text-[9px] text-white/30">{label}</p>
    </div>
  );
}

function SpotifyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}
