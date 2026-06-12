import type { VisualScene, SceneConfig, SceneType } from '@/types/visual';
import type { AudioAnalysisData } from '@/types/audio';
import { WaveformScene } from './scenes/WaveformScene';
import { BarsScene } from './scenes/BarsScene';
import { CircularScene } from './scenes/CircularScene';
import { ParticleScene } from './scenes/ParticleScene';

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

function createScene(type: SceneType): VisualScene {

  switch (type) {

    case 'waveform':

      return new WaveformScene();

    case 'bars':

      return new BarsScene();

    case 'circular':

      return new CircularScene();

    case 'particles':

      return new ParticleScene();

  }

  return new BarsScene();

}

export class VisualEngine {
  private canvas: HTMLCanvasElement | null = null;
  private scene: VisualScene | null = null;
  private config: SceneConfig = { ...DEFAULT_CONFIG };

  init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.setScene(this.config.type);
  }

  setScene(type: SceneType) {
    this.scene?.destroy();
    this.config.type = type;
    if (!this.canvas) return;
    this.scene = createScene(type);
    this.scene.init(this.canvas);
  }

  updateConfig(partial: Partial<SceneConfig>) {
    const prevType = this.config.type;
    this.config = { ...this.config, ...partial };
    if (partial.type && partial.type !== prevType) {
      this.setScene(partial.type);
    }
  }

  render(analysis: AudioAnalysisData) {
    if (!this.canvas || !this.scene) return;
    this.scene.update(analysis, this.config);
  }

  resize(width: number, height: number) {
    // canvas.width/height are already set by useVisualEngine with correct DPR
    this.scene?.resize(width, height);
  }

  destroy() {
    this.scene?.destroy();
    this.scene = null;
    this.canvas = null;
  }

  get currentConfig(): SceneConfig {
    return { ...this.config };
  }
}
