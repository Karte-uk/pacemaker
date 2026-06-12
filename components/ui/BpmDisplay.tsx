'use client';

interface Props {
  bpm: number;
  beat: boolean;
  volume: number;
}

export function BpmDisplay({ bpm, beat, volume }: Props) {
  return (
    <div className={`flex items-center gap-2 transition-all duration-75 ${beat ? 'scale-105' : 'scale-100'}`}>
      <div
        className={`w-2.5 h-2.5 rounded-full transition-all duration-75 ${beat ? 'bg-purple-400 shadow-lg shadow-purple-500/60' : 'bg-white/20'}`}
      />
      <span className="text-xs font-mono text-white/50">
        <span className={`text-sm font-bold ${beat ? 'text-purple-300' : 'text-white/70'}`}>{bpm}</span>
        {' '}BPM
      </span>
      <div className="ml-auto flex items-center gap-1">
        <div
          className="w-16 h-1 rounded-full bg-white/10 overflow-hidden"
          title={`Volume: ${Math.round(volume * 100)}%`}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-75"
            style={{ width: `${Math.min(volume * 300, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
