export type AudioSourceType = 'file' | 'microphone' | 'system';

export interface AudioAnalysisData {
  frequencyData: Uint8Array<ArrayBuffer>;
  timedomainData: Uint8Array<ArrayBuffer>;
  volume: number;         // 0-1 RMS volume
  bass: number;           // 0-1 low freq energy (20-300 Hz)
  mid: number;            // 0-1 mid freq energy (300-4000 Hz)
  treble: number;         // 0-1 high freq energy (4000-20000 Hz)
  bpm: number;            // detected BPM
  beat: boolean;          // true on beat hit
  bufferLength: number;
  sampleRate: number;
}

export interface AudioSource {
  type: AudioSourceType;
  connect(context: AudioContext): Promise<AudioNode>;
  disconnect(): void;
  isConnected: boolean;
}

export interface FileAudioSourceOptions {
  file: File;
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  durationMs: number;
  chunks: Blob[];
}
