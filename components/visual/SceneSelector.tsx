'use client';
import type { SceneType } from '@/types/visual';

const SCENES: { type: SceneType; label: string; icon: string; desc: string }[] = [
  { type: 'bars',      label: 'Bars',   icon: '▐▐▐', desc: 'Frequency spectrum bars' },
  { type: 'waveform',  label: 'Wave',   icon: '〜〜', desc: 'Oscilloscope waveform' },
  { type: 'circular',  label: 'Orbit',  icon: '◎',   desc: 'Arc reactor energy field' },
  { type: 'particles', label: 'Sparks', icon: '✦',   desc: 'Cosmic particle vortex' },
];

interface Props {
  current: SceneType;
  onChange: (type: SceneType) => void;
}

export function SceneSelector({ current, onChange }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-widest text-white/40 font-medium">Visual Scene</p>
      <div className="grid grid-cols-4 gap-1.5">
        {SCENES.map((s) => (
          <button
            key={s.type}
            onClick={() => onChange(s.type)}
            title={s.desc}
            className={`rounded-lg py-2 px-1 text-center transition-all duration-150 cursor-pointer
              ${current === s.type
                ? 'bg-purple-600 text-white ring-2 ring-purple-400 ring-offset-1 ring-offset-black'
                : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white'
              }`}
          >
            <div className="text-sm font-mono">{s.icon}</div>
            <div className="text-[10px] mt-0.5 font-medium">{s.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
