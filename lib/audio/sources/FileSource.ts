import type { AudioSource, AudioSourceType } from '@/types/audio';

export class FileSource implements AudioSource {
  readonly type: AudioSourceType = 'file';
  isConnected = false;

  private file: File;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private startTime = 0;
  private pauseOffset = 0;
  private _isPlaying = false;

  constructor(file: File) {
    this.file = file;
  }

  async connect(context: AudioContext): Promise<AudioNode> {
    const arrayBuffer = await this.file.arrayBuffer();
    this.audioBuffer = await context.decodeAudioData(arrayBuffer);

    this.gainNode = context.createGain();
    this.play(context);
    this.isConnected = true;
    return this.gainNode;
  }

  play(context: AudioContext) {
    if (!this.audioBuffer || !this.gainNode) return;
    this.sourceNode?.stop();

    this.sourceNode = context.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    this.sourceNode.connect(this.gainNode);
    this.sourceNode.start(0, this.pauseOffset);
    this.startTime = context.currentTime - this.pauseOffset;
    this._isPlaying = true;
  }

  pause(context: AudioContext) {
    if (!this._isPlaying || !this.sourceNode) return;
    this.pauseOffset = context.currentTime - this.startTime;
    this.sourceNode.stop();
    this._isPlaying = false;
  }

  disconnect() {
    this.sourceNode?.stop();
    this.sourceNode?.disconnect();
    this.gainNode?.disconnect();
    this.isConnected = false;
    this._isPlaying = false;
  }

  get duration(): number {
    return this.audioBuffer?.duration ?? 0;
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }
}
