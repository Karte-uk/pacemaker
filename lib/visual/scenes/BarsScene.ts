import type { VisualScene, SceneConfig } from '@/types/visual';
import type { AudioAnalysisData } from '@/types/audio';
import { hexAlpha } from '@/lib/visual/utils';

// ─── Professional log-frequency bin mapper ────────────────────────────────────
// Maps each bar to a true logarithmic frequency range (30 Hz → 16 kHz),
// never touching bin 0 (DC offset). See comments in AudioAnalyzer for context.
const MIN_FREQ = 30;
const MAX_FREQ = 16000;

function freqToBin(hz: number, sampleRate: number, bufferLength: number): number {
  return Math.round((hz * bufferLength * 2) / sampleRate);
}

function buildBarBins(
  count: number, sampleRate: number, bufferLength: number,
): Array<{ lo: number; hi: number }> {
  const ratio = MAX_FREQ / MIN_FREQ;
  return Array.from({ length: count }, (_, i) => {
    const freqLo = MIN_FREQ * Math.pow(ratio, i / count);
    const freqHi = MIN_FREQ * Math.pow(ratio, (i + 1) / count);
    const lo = Math.max(1, freqToBin(freqLo, sampleRate, bufferLength));
    const hi = Math.min(bufferLength - 1, Math.max(lo + 1, freqToBin(freqHi, sampleRate, bufferLength)));
    return { lo, hi };
  });
}

export class BarsScene implements VisualScene {
  readonly type = 'bars' as const;
  private ctx: CanvasRenderingContext2D | null = null;
  private width = 0;
  private height = 0;

  // Spring physics: position (0–1) and velocity per bar
  private pos: Float32Array = new Float32Array(0);
  private vel: Float32Array = new Float32Array(0);

  private binMap: Array<{ lo: number; hi: number }> = [];
  private lastCount = 0;
  private lastSampleRate = 0;

  // Beat kick: brief global height lift that decays
  private kickStrength = 0;

  init(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
  }

  resize(w: number, h: number) { this.width = w; this.height = h; }

  update(analysis: AudioAnalysisData, config: SceneConfig) {
    const ctx = this.ctx;
    if (!ctx) return;
    const { frequencyData, bufferLength, beat, volume, bass, sampleRate } = analysis;
    const { primaryColor, secondaryColor, backgroundColor, sensitivity, glow, trail, barCount } = config;

    // Background fade
    ctx.fillStyle = backgroundColor;
    ctx.globalAlpha = 0.08 + (1 - trail) * 0.55;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.globalAlpha = 1;

    const count = Math.max(20, Math.min(barCount, 120));

    if (count !== this.lastCount || sampleRate !== this.lastSampleRate) {
      this.pos    = new Float32Array(count);
      this.vel    = new Float32Array(count);
      this.binMap = buildBarBins(count, sampleRate, bufferLength);
      this.lastCount      = count;
      this.lastSampleRate = sampleRate;
    }

    const gap      = Math.max(1, Math.round(this.width * 0.004));
    const barW     = (this.width - gap * (count + 1)) / count;
    const maxH     = this.height * 0.88;
    const baseline = this.height * 0.95;
    const radius   = Math.min(barW * 0.5, 5);
    const glowBlur = glow * 24 * (beat ? 1.7 : 1);

    // Beat kick: snaps bars upward then decays
    if (beat) this.kickStrength = Math.min(1, (0.05 + bass * 0.06) * sensitivity);
    this.kickStrength *= 0.86;

    // ── Main bar pass ────────────────────────────────────────────────────────
    for (let i = 0; i < count; i++) {
      const { lo, hi } = this.binMap[i];
      let sum = 0;
      for (let b = lo; b <= hi; b++) sum += frequencyData[b];
      const target = (sum / (hi - lo + 1) / 255) * sensitivity;

      // Asymmetric spring: fast snappy attack, slow liquid release
      const stiffness = target > this.pos[i] ? 0.38 : 0.14;
      this.vel[i] = (this.vel[i] + (target - this.pos[i]) * stiffness) * 0.72;
      this.pos[i] = Math.max(0, this.pos[i] + this.vel[i]);

      const barH = (this.pos[i] + this.kickStrength * 0.035) * maxH;
      const x    = gap + i * (barW + gap);
      const y    = baseline - barH;

      if (barH < 1) continue;

      const grad = ctx.createLinearGradient(x, y, x, baseline);
      grad.addColorStop(0,    beat ? '#ffffff' : primaryColor);
      grad.addColorStop(0.35, primaryColor);
      grad.addColorStop(1,    secondaryColor);

      ctx.shadowColor = primaryColor;
      ctx.shadowBlur  = glowBlur * (0.2 + this.pos[i] * 1.3);
      ctx.fillStyle   = grad;

      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, [radius, radius, 0, 0]);
      ctx.fill();

      // Floor reflection
      if (barH > 4) {
        ctx.globalAlpha = 0.08;
        ctx.shadowBlur  = 0;
        const reflGrad = ctx.createLinearGradient(x, baseline, x, baseline + barH * 0.28);
        reflGrad.addColorStop(0, primaryColor);
        reflGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = reflGrad;
        ctx.beginPath();
        ctx.roundRect(x, baseline, barW, barH * 0.28, [0, 0, radius, radius]);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    ctx.shadowBlur = 0;

    // ── Additive glow pass: screen composite for bright bars ─────────────────
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < count; i++) {
      if (this.pos[i] < 0.12) continue;
      const barH = this.pos[i] * maxH;
      const x    = gap + i * (barW + gap);
      const y    = baseline - barH;
      ctx.globalAlpha = Math.min(0.5, this.pos[i] * 0.5 * glow);
      ctx.fillStyle   = primaryColor;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, [radius, radius, 0, 0]);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // Beat border flash
    if (beat && volume > 0.05) {
      ctx.strokeStyle = hexAlpha(primaryColor, 0.22 + bass * 0.12);
      ctx.lineWidth   = 1;
      ctx.strokeRect(1, 1, this.width - 2, this.height - 2);
    }
  }

  destroy() { this.ctx = null; }
}
