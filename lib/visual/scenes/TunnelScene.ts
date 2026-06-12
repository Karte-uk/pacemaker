import type { VisualScene, SceneConfig } from '@/types/visual';
import type { AudioAnalysisData } from '@/types/audio';
import { fbm, hexAlpha, lerpColor, hexToRgb } from '@/lib/visual/utils';

const SPEED_LINE_COUNT = 6;

export class TunnelScene implements VisualScene {
  readonly type = 'tunnel' as const;
  private ctx: CanvasRenderingContext2D | null = null;
  private width = 0;
  private height = 0;
  private t = 0;
  private bassExpansion = 0;

  // Radial speed lines — give the sense of flying through the vortex
  private speedT   = new Float32Array(SPEED_LINE_COUNT).map(() => Math.random());
  private speedAng = new Float32Array(SPEED_LINE_COUNT).map((_, i) =>
    (i / SPEED_LINE_COUNT) * Math.PI * 2 + Math.random() * 0.8
  );

  init(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
  }

  resize(w: number, h: number) { this.width = w; this.height = h; }

  update(analysis: AudioAnalysisData, config: SceneConfig) {
    const ctx = this.ctx;
    if (!ctx) return;
    const { frequencyData, bass, treble, beat, volume } = analysis;
    const { primaryColor, secondaryColor, backgroundColor, sensitivity, glow, trail, speed, rings } = config;

    ctx.fillStyle = backgroundColor;
    ctx.globalAlpha = 0.12 + (1 - trail) * 0.6;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.globalAlpha = 1;

    const cx = this.width / 2;
    const cy = this.height / 2;
    const ringCount = Math.max(12, Math.min(rings, 48));
    const maxR      = Math.sqrt(cx * cx + cy * cy) * 1.15;
    const segments  = 72;

    this.t += speed * 0.022 + bass * 0.03 * sensitivity;

    // Brief bass expansion decays quickly
    if (beat) this.bassExpansion = Math.min(0.14, bass * sensitivity * 0.15);
    this.bassExpansion *= 0.87;

    // ── Radial speed lines (background layer) ────────────────────────────────
    ctx.save();
    ctx.translate(cx, cy);
    for (let l = 0; l < SPEED_LINE_COUNT; l++) {
      this.speedT[l] += speed * 0.014 + bass * 0.022 * sensitivity;
      if (this.speedT[l] > 1) this.speedT[l] -= 1;

      const t0  = this.speedT[l];
      const t1  = Math.min(1, t0 + 0.2);
      const ang = this.speedAng[l] + this.t * 0.08;

      ctx.strokeStyle = hexAlpha(primaryColor, 0.055 + bass * 0.055 * sensitivity);
      ctx.lineWidth   = 0.7;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * maxR * t0, Math.sin(ang) * maxR * t0);
      ctx.lineTo(Math.cos(ang) * maxR * t1, Math.sin(ang) * maxR * t1);
      ctx.stroke();
    }
    ctx.restore();

    // ── Rings (back-to-front) ────────────────────────────────────────────────
    const [pr, pg, pb] = hexToRgb(primaryColor);

    for (let i = ringCount; i >= 0; i--) {
      const depth  = (i + (this.t % 1)) / ringCount;
      const baseR  = depth * maxR * (1 + this.bassExpansion * (1 - depth));

      const spinRate    = 1 + (1 - depth) * 3.5;
      const ringAngle   = this.t * spinRate * (i % 2 === 0 ? 1 : -0.7);

      const freqIdx  = Math.floor((1 - depth) * 100);
      const freqAmp  = (frequencyData[Math.min(freqIdx, frequencyData.length - 1)] ?? 0) / 255;
      const trebleAmp = treble * sensitivity;

      const color  = lerpColor(primaryColor, secondaryColor, depth);
      const alpha  = 0.08 + depth * 0.8;
      const lineW  = Math.max(0.5, this.width * 0.0022 * (0.2 + depth * 0.8));

      // Chromatic aberration: stronger for inner (near) rings
      const caOff = Math.max(1, (1 - depth) * 3.5 * glow);

      // Shared ring-path builder
      const buildRing = (radiusOffset: number) => {
        ctx.beginPath();
        for (let s = 0; s <= segments; s++) {
          const ang     = (s / segments) * Math.PI * 2 + ringAngle;
          const fSlice  = Math.floor((s / segments) * 48) + freqIdx;
          const lFreq   = (frequencyData[Math.min(fSlice, frequencyData.length - 1)] ?? 0) / 255;

          // FBM organic distortion — inner rings deform more than outer
          const n1 = fbm(ang * 1.8 + i * 0.4, this.t * 0.8) * 0.10 * (1.3 - depth);
          const n2 = fbm(ang * 3.5 - i * 0.3, this.t * 1.3) * 0.05 * (1.2 - depth);
          const w1 = Math.sin(ang * 5 + this.t * 2.2) * 0.04 * trebleAmp;
          const bp = beat ? 0.05 * depth : 0;

          const distort = lFreq * sensitivity * 0.18 + n1 + n2 + w1 + bp;
          const r = (baseR + radiusOffset) * (1 + distort);

          const x = cx + Math.cos(ang) * r;
          const y = cy + Math.sin(ang) * r;
          if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
      };

      ctx.lineWidth   = lineW;
      ctx.shadowColor = color;
      ctx.shadowBlur  = beat
        ? glow * 38 * depth
        : glow * 13 * (0.3 + freqAmp * sensitivity) * depth;

      // Red channel (larger radius) — chromatic aberration fringe
      ctx.globalCompositeOperation = 'screen';
      ctx.strokeStyle = `rgba(${pr},${Math.round(pg * 0.25)},${Math.round(pb * 0.25)},${(alpha * 0.4).toFixed(3)})`;
      buildRing(+caOff);
      ctx.stroke();

      // Blue channel (smaller radius) — chromatic aberration fringe
      ctx.strokeStyle = `rgba(${Math.round(pr * 0.25)},${Math.round(pg * 0.25)},${pb},${(alpha * 0.4).toFixed(3)})`;
      buildRing(-caOff);
      ctx.stroke();

      // Main ring
      ctx.globalCompositeOperation = 'source-over';
      const [cr, cg, cb] = hexToRgb(color);
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},${alpha.toFixed(3)})`;
      buildRing(0);
      ctx.stroke();
    }

    // ── Central vanishing point ──────────────────────────────────────────────
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;
    const coreR    = maxR * 0.028 * (1 + volume * sensitivity * 1.2 + this.bassExpansion * 0.6);
    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 3);
    coreGrad.addColorStop(0,   hexAlpha(primaryColor, 1));
    coreGrad.addColorStop(0.4, hexAlpha(primaryColor, 0.6));
    coreGrad.addColorStop(1,   'transparent');
    ctx.fillStyle   = coreGrad;
    ctx.shadowColor = primaryColor;
    ctx.shadowBlur  = glow * 60 * (1 + volume * sensitivity);
    ctx.beginPath();
    ctx.arc(cx, cy, coreR * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  destroy() { this.ctx = null; }
}
