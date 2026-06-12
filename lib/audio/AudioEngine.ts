import { AudioAnalyzer } from './AudioAnalyzer';
import { FileSource } from './sources/FileSource';
import { MicrophoneSource } from './sources/MicrophoneSource';
import { SystemAudioSource } from './sources/SystemAudioSource';
import type { AudioAnalysisData, AudioSource, AudioSourceType } from '@/types/audio';

export class AudioEngine {
  private context: AudioContext | null = null;
  private analyzer: AudioAnalyzer | null = null;
  private currentSource: AudioSource | null = null;
  private animFrameId: number | null = null;
  private onAnalysis: ((data: AudioAnalysisData) => void) | null = null;

  async init() {
    this.context = new AudioContext();
    this.analyzer = new AudioAnalyzer(this.context);
    this.analyzer.node.connect(this.context.destination);
  }

  async setSource(type: AudioSourceType, file?: File) {
    await this.disconnectSource();

    if (!this.context || !this.analyzer) {
      await this.init();
    }

    // AudioContext may be suspended until user gesture
    if (this.context!.state === 'suspended') {
      await this.context!.resume();
    }

    let source: AudioSource;
    if (type === 'file' && file) {
      source = new FileSource(file);
    } else if (type === 'microphone') {
      source = new MicrophoneSource();
    } else if (type === 'system') {
      source = new SystemAudioSource();
    } else {
      throw new Error(`Unknown source type: ${type}`);
    }

    const node = await source.connect(this.context!);
    node.connect(this.analyzer!.node);
    this.currentSource = source;
  }

  private async disconnectSource() {
    if (this.currentSource) {
      this.currentSource.disconnect();
      this.currentSource = null;
    }
  }

  startAnalysisLoop(callback: (data: AudioAnalysisData) => void) {
    this.onAnalysis = callback;
    const loop = () => {
      if (this.analyzer) {
        callback(this.analyzer.analyze());
      }
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  stopAnalysisLoop() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.onAnalysis = null;
  }

  async destroy() {
    this.stopAnalysisLoop();
    await this.disconnectSource();
    await this.context?.close();
    this.context = null;
    this.analyzer = null;
  }

  get fileSource(): FileSource | null {
    return this.currentSource instanceof FileSource ? this.currentSource : null;
  }

  get audioContext(): AudioContext | null {
    return this.context;
  }
}
