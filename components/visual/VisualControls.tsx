'use client';
import type { SceneConfig, SceneType } from '@/types/visual';

interface Props {
  config: SceneConfig;
  onChange: (partial: Partial<SceneConfig>) => void;
}

const COLOR_PRESETS: { name: string; primary: string; secondary: string; bg: string }[] = [
  { name: 'Neon',   primary: '#a855f7', secondary: '#06b6d4', bg: '#000000' },
  { name: 'Fire',   primary: '#f97316', secondary: '#ef4444', bg: '#0a0000' },
  { name: 'Ocean',  primary: '#06b6d4', secondary: '#3b82f6', bg: '#000a10' },
  { name: 'Forest', primary: '#22c55e', secondary: '#84cc16', bg: '#000a00' },
  { name: 'Gold',   primary: '#f59e0b', secondary: '#fcd34d', bg: '#080600' },
  { name: 'Pink',   primary: '#ec4899', secondary: '#f43f5e', bg: '#0a0005' },
];

export function VisualControls({ config, onChange }: Props) {
  return (
    <div className="space-y-5">
      {/* Colors */}
      <Section label="Colors">
        {/* Presets */}
        <div className="grid grid-cols-6 gap-1.5">
          {COLOR_PRESETS.map((p) => (
            <button
              key={p.name}
              title={p.name}
              onClick={() => onChange({ primaryColor: p.primary, secondaryColor: p.secondary, backgroundColor: p.bg })}
              className="group relative rounded-lg h-7 border border-white/10 hover:border-white/35 transition-all cursor-pointer overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${p.primary}, ${p.secondary})` }}
            >
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white/0 group-hover:text-white transition-colors bg-black/30 opacity-0 group-hover:opacity-100">
                {p.name}
              </span>
            </button>
          ))}
        </div>
        {/* Custom pickers */}
        <div className="grid grid-cols-3 gap-2 mt-2">
          <ColorPicker label="Primary"    value={config.primaryColor}    onChange={(v) => onChange({ primaryColor: v })} />
          <ColorPicker label="Secondary"  value={config.secondaryColor}  onChange={(v) => onChange({ secondaryColor: v })} />
          <ColorPicker label="Background" value={config.backgroundColor} onChange={(v) => onChange({ backgroundColor: v })} />
        </div>
      </Section>

      {/* Reaction */}
      <Section label="Reaction">
        <Slider label="Sensitivity" value={config.sensitivity} min={0.1} max={1}   step={0.01} onChange={(v) => onChange({ sensitivity: v })} />
        <Slider label="Glow"        value={config.glow}        min={0}   max={1}   step={0.01} onChange={(v) => onChange({ glow: v })} />
        <Slider label="Trail"       value={config.trail}       min={0}   max={1}   step={0.01} onChange={(v) => onChange({ trail: v })} />
      </Section>

      {/* Motion */}
      <Section label="Motion">
        <Slider label="Speed" value={config.speed} min={0.05} max={1} step={0.01} onChange={(v) => onChange({ speed: v })} />
      </Section>

      {/* Scene-specific */}
      <SceneOptions config={config} onChange={onChange} />
    </div>
  );
}

function SceneOptions({ config, onChange }: Props) {
  const { type } = config;

  if (type === 'bars') {
    return (
      <Section label="Bars Options">
        <Slider label="Bar Count" value={config.barCount} min={20} max={120} step={2} format={(v) => String(Math.round(v))} onChange={(v) => onChange({ barCount: Math.round(v) })} />
      </Section>
    );
  }

  if (type === 'waveform') {
    return (
      <Section label="Waveform Options">
        <Toggle label="Mirror" value={config.mirror} onChange={(v) => onChange({ mirror: v })} />
        <Toggle label="Filled" value={config.filled} onChange={(v) => onChange({ filled: v })} />
      </Section>
    );
  }

  if (type === 'particles') {
    return (
      <Section label="Particle Options">
        <Slider label="Particle Size" value={config.particleSize} min={0.1} max={1} step={0.05} onChange={(v) => onChange({ particleSize: v })} />
      </Section>
    );
  }

  if (type === 'tunnel') {
    return (
      <Section label="Tunnel Options">
        <Slider label="Ring Count" value={config.rings} min={12} max={48} step={2} format={(v) => String(Math.round(v))} onChange={(v) => onChange({ rings: Math.round(v) })} />
      </Section>
    );
  }

  return null;
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <p className="text-[10px] uppercase tracking-widest text-white/35 font-semibold">{label}</p>
      {children}
    </div>
  );
}

function Slider({
  label, value, min, max, step, format, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number;
  format?: (v: number) => string; onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const display = format ? format(value) : `${Math.round(value * 100)}%`;
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[11px] text-white/55">{label}</span>
        <span className="text-[10px] text-white/30 font-mono tabular-nums w-8 text-right">{display}</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-white/8">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 pointer-events-none"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-white/55">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-8 h-4 rounded-full transition-colors cursor-pointer border ${value ? 'bg-purple-600 border-purple-500' : 'bg-white/8 border-white/15'}`}
      >
        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform shadow-sm ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="cursor-pointer block">
      <p className="text-[10px] text-white/35 mb-1">{label}</p>
      <div className="relative h-7 rounded-lg border border-white/10 hover:border-white/25 transition-all overflow-hidden">
        <div className="absolute inset-0" style={{ background: value }} />
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
      </div>
    </label>
  );
}
