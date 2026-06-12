'use client';
import { useRef, useState, useCallback } from 'react';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { SourceSelector } from './audio/SourceSelector';
import { SceneSelector } from './visual/SceneSelector';
import { VisualControls } from './visual/VisualControls';
import { Visualizer } from './visual/Visualizer';
import { RecordingControls } from './ui/RecordingControls';
import { BpmDisplay } from './ui/BpmDisplay';
import type { SceneType, SceneConfig } from '@/types/visual';
import type { AudioSourceType } from '@/types/audio';

const DEFAULT_CONFIG: SceneConfig = {
  type: 'bars',
  primaryColor: '#a855f7',
  secondaryColor: '#06b6d4',
  backgroundColor: '#000000',
  sensitivity: 0.7,
  speed: 0.5,
  glow: 0.55,
  trail: 0.65,
  barCount: 64,
  mirror: true,
  filled: true,
  particleSize: 0.5,
  rings: 28,
};

export function CreatorDashboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { analysis, isActive, error, startSource } = useAudioEngine();
  const [scene, setScene] = useState<SceneType>('bars');
  const [config, setConfig] = useState<SceneConfig>(DEFAULT_CONFIG);

  const handleSource = useCallback(async (type: AudioSourceType, file?: File) => {
    await startSource(type, file);
  }, [startSource]);

  const handleConfigChange = useCallback((partial: Partial<SceneConfig>) => {
    setConfig((c) => ({ ...c, ...partial }));
  }, []);

  const handleSceneChange = useCallback((type: SceneType) => {
    setScene(type);
    setConfig((c) => ({ ...c, type }));
  }, []);

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 flex-shrink-0 border-r border-white/8 flex flex-col overflow-y-auto">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-sm font-black">
              P
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight">Pacemaker</h1>
                <span className="text-[9px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded-md">
                  beta
                </span>
              </div>
              <p className="text-[10px] text-white/30">Music Visualizer</p>
            </div>
          </div>
        </div>

        <div className="flex-1 px-4 py-4 space-y-6">
          <SourceSelector onSource={handleSource} isActive={isActive} error={error} />
          <SceneSelector current={scene} onChange={handleSceneChange} />
          <VisualControls config={config} onChange={handleConfigChange} />
          <RecordingControls canvasRef={canvasRef} />
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/8">
          <BpmDisplay bpm={analysis.bpm} beat={analysis.beat} volume={analysis.volume} />
        </div>
      </aside>

      {/* Canvas */}
      <main className="flex-1 relative overflow-hidden">
        {/* Top HUD */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
          <div className="flex items-center gap-2">
            {isActive && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-white/50">Live</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <EnergyBar label="Bass" value={analysis.bass}   color="#a855f7" />
            <EnergyBar label="Mid"  value={analysis.mid}    color="#06b6d4" />
            <EnergyBar label="Hi"   value={analysis.treble} color="#22c55e" />
          </div>
        </div>

        <div className="w-full h-full">
          <Visualizer analysis={analysis} scene={scene} config={config} canvasRef={canvasRef} />
        </div>

        {!isActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="text-6xl mb-4 opacity-20">🎵</div>
            <p className="text-white/20 text-sm font-medium">Upload a track or connect a mic to begin</p>
          </div>
        )}
      </main>
    </div>
  );
}

function EnergyBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-1 h-8 bg-white/10 rounded-full overflow-hidden flex flex-col-reverse">
        <div
          className="w-full rounded-full transition-all duration-75"
          style={{ height: `${Math.min(value * 100, 100)}%`, background: color }}
        />
      </div>
      <span className="text-[9px] text-white/30">{label}</span>
    </div>
  );
}
