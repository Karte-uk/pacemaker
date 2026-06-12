import type { AudioAnalysisData } from '@/types/audio';

const FFT_SIZE = 2048;
const BEAT_HISTORY_SIZE = 60;
const BEAT_THRESHOLD_MULTIPLIER = 1.5;
const BEAT_COOLDOWN_MS = 200;

// Bin 0 is the DC offset (0 Hz) — always elevated, never represents audio.
// Bins 1–2 are ultrasub (<45 Hz) — microphone noise and power supply hum.
// Skip all three in every band calculation.
const SKIP_BINS = 3;

export class AudioAnalyzer {
  private context: AudioContext;
  private analyser: AnalyserNode;
  private frequencyData: Uint8Array<ArrayBuffer>;
  private timedomainData: Uint8Array<ArrayBuffer>;
  private hzPerBin: number;

  private energyHistory: number[] = [];
  private lastBeatTime = 0;
  private bpmHistory: number[] = [];
  private detectedBpm = 128;

  constructor(context: AudioContext) {
    this.context = context;
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = FFT_SIZE;
    this.analyser.smoothingTimeConstant = 0.8;
    // Default maxDecibels is -30 dBFS — music peaks at -10 to -15 dBFS,
    // so most dynamic range was wasted. Setting -10 uses the full 0–255 range.
    this.analyser.minDecibels = -90;
    this.analyser.maxDecibels = -10;

    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    this.timedomainData = new Uint8Array(this.analyser.fftSize);
    // hz represented by each bin = sampleRate / fftSize
    this.hzPerBin = context.sampleRate / FFT_SIZE;
  }

  get node(): AnalyserNode { return this.analyser; }

  analyze(): AudioAnalysisData {
    this.analyser.getByteFrequencyData(this.frequencyData);
    this.analyser.getByteTimeDomainData(this.timedomainData);

    const volume = this.computeRMS(this.timedomainData);
    const { bass, mid, treble } = this.computeBands();
    const { beat, bpm } = this.detectBeat(bass);

    return {
      frequencyData: this.frequencyData,
      timedomainData: this.timedomainData,
      volume,
      bass,
      mid,
      treble,
      bpm,
      beat,
      bufferLength: this.analyser.frequencyBinCount,
      sampleRate: this.context.sampleRate,
    };
  }

  private computeRMS(data: Uint8Array<ArrayBuffer>): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const n = (data[i] - 128) / 128;
      sum += n * n;
    }
    return Math.sqrt(sum / data.length);
  }

  private computeBands(): { bass: number; mid: number; treble: number } {
    const binCount = this.analyser.frequencyBinCount;
    // Map frequency ranges to bin indices, starting at SKIP_BINS to avoid DC
    const bassStart = SKIP_BINS;
    const bassEnd   = Math.round(300  / this.hzPerBin);
    const midEnd    = Math.round(4000 / this.hzPerBin);

    const bass   = this.bandAverage(bassStart, bassEnd)  / 255;
    const mid    = this.bandAverage(bassEnd,   midEnd)   / 255;
    const treble = this.bandAverage(midEnd,    binCount) / 255;

    return { bass, mid, treble };
  }

  private bandAverage(start: number, end: number): number {
    if (end <= start) return 0;
    let sum = 0;
    for (let i = start; i < end; i++) sum += this.frequencyData[i];
    return sum / (end - start);
  }

  private detectBeat(bass: number): { beat: boolean; bpm: number } {
    this.energyHistory.push(bass);
    if (this.energyHistory.length > BEAT_HISTORY_SIZE) this.energyHistory.shift();

    const avg = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
    const now = performance.now();
    const elapsed = now - this.lastBeatTime;

    const isBeat =
      bass > avg * BEAT_THRESHOLD_MULTIPLIER &&
      elapsed > BEAT_COOLDOWN_MS &&
      bass > 0.12;

    if (isBeat) {
      if (this.lastBeatTime > 0 && elapsed < 2000) {
        const instantBpm = 60000 / elapsed;
        if (instantBpm >= 60 && instantBpm <= 200) {
          this.bpmHistory.push(instantBpm);
          if (this.bpmHistory.length > 8) this.bpmHistory.shift();
          this.detectedBpm = this.bpmHistory.reduce((a, b) => a + b, 0) / this.bpmHistory.length;
        }
      }
      this.lastBeatTime = now;
    }

    return { beat: isBeat, bpm: Math.round(this.detectedBpm) };
  }
}
