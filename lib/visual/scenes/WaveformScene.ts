import type { VisualScene, SceneConfig } from '@/types/visual';
import type { AudioAnalysisData } from '@/types/audio';
import { fbm, hexAlpha } from '@/lib/visual/utils';

export class WaveformScene implements VisualScene {
  readonly type = 'waveform' as const;
  private ctx: CanvasRenderingContext2D | null = null;
  private width = 0;
  private height = 0;
  private phase = 0;
  // Slow bass smoothing drives the breathing separation of the two wave halves
  private bassBreath = 0;

  init(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
  }

  resize(w: number, h: number) { this.width = w; this.height = h; }

  update(analysis: AudioAnalysisData, config: SceneConfig) {
    const ctx = this.ctx;
    if (!ctx) return;
    const { timedomainData, volume, bass, treble, beat } = analysis;
    const { primaryColor, secondaryColor, backgroundColor, sensitivity, glow, trail, speed, mirror, filled } = config;

    const bgAlpha = 0.06 + (1 - trail) * 0.5;
    ctx.fillStyle = backgroundColor;
    ctx.globalAlpha = bgAlpha;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.globalAlpha = 1;

    this.phase += speed * 0.015;

    // Slow breathing: bass pushes each wave half outward from center
    this.bassBreath = this.bassBreath * 0.93 + bass * 0.07;
    const breathe = this.bassBreath * this.height * 0.055 * sensitivity;

    const ampScale = this.height * (mirror ? 0.72 : 0.85) * (0.4 + sensitivity * 0.7);
    const halves: (1 | -1)[] = mirror ? [1, -1] : [1];

    for (const sign of halves) {
      const cy  = this.height / 2 + sign * breathe;
      const pts = buildPoints(timedomainData, this.width, cy, ampScale, this.phase, sign, treble, sensitivity);

      // ── Pass 1: wide bloom halo (additive screen composite) ──────────────
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha  = 0.16 * glow;
      ctx.lineWidth    = Math.max(5, this.width * 0.007);
      ctx.strokeStyle  = primaryColor;
      ctx.shadowColor  = primaryColor;
      ctx.shadowBlur   = glow * 44;
      ctx.beginPath();
      moveToCurve(ctx, pts);
      ctx.stroke();

      // ── Pass 2: inner glow (screen composite) ────────────────────────────
      ctx.globalAlpha = 0.42 * glow;
      ctx.lineWidth   = Math.max(2.5, this.width * 0.003);
      ctx.shadowBlur  = glow * 18;
      ctx.beginPath();
      moveToCurve(ctx, pts);
      ctx.stroke();

      ctx.globalCompositeOperation = 'source-over';
      ctx.shadowBlur   = 0;
      ctx.globalAlpha  = 1;

      // Filled area under/above the wave
      if (filled) {
        ctx.beginPath();
        moveToCurve(ctx, pts);
        ctx.lineTo(this.width, cy);
        ctx.lineTo(0, cy);
        ctx.closePath();
        const peakY = sign === 1 ? cy - ampScale : cy + ampScale;
        const grad  = ctx.createLinearGradient(0, peakY, 0, cy);
        grad.addColorStop(0, hexAlpha(primaryColor, 0.32));
        grad.addColorStop(1, hexAlpha(primaryColor, 0));
        ctx.fillStyle   = grad;
        ctx.globalAlpha = 0.7;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // ── Pass 3: crisp bright core ────────────────────────────────────────
      const lineW = Math.max(1.5, this.width * 0.0018 * (1 + volume * 2 * sensitivity));
      ctx.lineWidth = lineW;
      const lineGrad = ctx.createLinearGradient(0, 0, this.width, 0);
      lineGrad.addColorStop(0, secondaryColor);
      lineGrad.addColorStop(0.5, primaryColor);
      lineGrad.addColorStop(1, secondaryColor);
      ctx.strokeStyle = lineGrad;
      ctx.shadowColor = primaryColor;
      ctx.shadowBlur  = glow * 14 * (beat ? 2.2 : 1);
      ctx.beginPath();
      moveToCurve(ctx, pts);
      ctx.stroke();
    }

    ctx.shadowBlur  = 0;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  destroy() { this.ctx = null; }
}

function buildPoints(
  data: Uint8Array<ArrayBuffer>,
  width: number,
  cy: number,
  ampScale: number,
  phase: number,
  sign: 1 | -1,
  treble: number,
  sensitivity: number,
): [number, number][] {
  const pts: [number, number][] = [];
  const len = data.length;
  for (let i = 0; i < len; i++) {
    const v    = data[i] / 128 - 1;
    const idle = Math.sin(i * 0.025 + phase) * 0.06;
    // FBM ripples: treble energy drives high-frequency organic texture
    const ripple = fbm(i * 0.055, phase) * treble * sensitivity * 0.09;
    const y = cy + sign * (v + idle + ripple) * ampScale;
    pts.push([(i / (len - 1)) * width, y]);
  }
  return pts;
}

function moveToCurve(ctx: CanvasRenderingContext2D, pts: [number, number][]) {
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
}
