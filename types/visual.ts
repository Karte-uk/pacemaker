import type { AudioAnalysisData } from './audio';

export type SceneType = 'waveform' | 'bars' | 'circular' | 'particles';

export interface SceneConfig {
  type: SceneType;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  sensitivity: number;   // 0-1
  speed: number;         // 0-1
  glow: number;          // 0-1  shadow blur intensity
  trail: number;         // 0-1  persistence (higher = longer trails)
  // Scene-specific
  barCount: number;      // bars: 20–120
  mirror: boolean;       // waveform: mirror both halves
  filled: boolean;       // waveform: fill under curve
  particleSize: number;  // particles: 0-1 base size multiplier
  rings: number;         // tunnel: 12–48
}

export interface VisualScene {
  type: SceneType;
  init(canvas: HTMLCanvasElement): void;
  update(analysis: AudioAnalysisData, config: SceneConfig): void;
  resize(width: number, height: number): void;
  destroy(): void;
}

export interface ExportOptions {
  format: 'mp4' | 'webm';
  width: number;
  height: number;
  fps: number;
  audioBitrate: number;
  videoBitrate: number;
}
