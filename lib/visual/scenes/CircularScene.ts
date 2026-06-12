// ─── ORBIT — Production redesign ─────────────────────────────────────────────
// Visual target: Arc reactor / Black hole accretion disk / Futuristic reactor
// Architecture:
//   • 128-bar full-360° spectrum with spring physics
//   • Smooth bezier ring-curve overlaying bar tops (additive glow)
//   • 4 depth-layer ring tracks at different radii
//   • 90 permanent orbital particles — bass inner / mid middle / high outer
//   • Energy waves expanding from core on beat
//   • Energy pulses (bright arcs) traveling around the ring
//   • Living FBM-deformed core: breathes, pulses, emits corona

import type { VisualScene, SceneConfig } from '@/types/visual';
import type { AudioAnalysisData } from '@/types/audio';
import { fbm, hexAlpha, lerpColor, hexToRgb } from '@/lib/visual/utils';

const BAR_COUNT  = 128;
const ORB_POOL   = 90;
const MAX_WAVES  = 8;
const MAX_PULSES = 6;

export class CircularScene implements VisualScene {
  readonly type = 'circular' as const;
  private ctx: CanvasRenderingContext2D | null = null;
  private width = 0;
  private height = 0;
  private outerRotation = 0;
  private outerSmoothed = new Float32Array(OUTER_COUNT);

  // Orbital particles — permanent, just drift around the ring
  private orbAngles   = new Float32Array(ORB_COUNT);
  private orbSpeeds   = new Float32Array(ORB_COUNT);
  private orbRadiiOff = new Float32Array(ORB_COUNT); // ±fraction of outerR
  private orbSizes    = new Float32Array(ORB_COUNT);
  private orbColorT   = new Float32Array(ORB_COUNT);
  private orbInited   = false;

  // Energy pulses — bright arcs spawned on beat, fade out
  private pulseAngle  = new Float32Array(MAX_PULSES);
  private pulseSpeed  = new Float32Array(MAX_PULSES);
  private pulseAlpha  = new Float32Array(MAX_PULSES);
  private pulseArc    = new Float32Array(MAX_PULSES);
  private pulseActive = new Uint8Array(MAX_PULSES);

  init(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.initOrbitals();
  }

  private initOrbitals() {
    for (let i = 0; i < ORB_COUNT; i++) {
      this.orbAngles[i]   = (i / ORB_COUNT) * Math.PI * 2 + Math.random() * 0.5;
      this.orbSpeeds[i]   = (0.004 + Math.random() * 0.01) * (Math.random() > 0.5 ? 1 : -1);
      this.orbRadiiOff[i] = (Math.random() - 0.5) * 0.14;
      this.orbSizes[i]    = 1.5 + Math.random() * 2.5;
      this.orbColorT[i]   = i / ORB_COUNT;
    }
    this.orbInited = true;
  }

  resize(w: number, h: number) { this.width = w; this.height = h; }

  update(analysis: AudioAnalysisData, config: SceneConfig) {
    const ctx = this.ctx;
    if (!ctx) return;
    if (!this.orbInited) this.initOrbitals();
    const { frequencyData, bufferLength, beat, bass, volume } = analysis;
    const { primaryColor, secondaryColor, backgroundColor, sensitivity, glow, trail, speed } = config;

    const bgAlpha = 0.07 + (1 - trail) * 0.48;
    ctx.fillStyle = backgroundColor;
    ctx.globalAlpha = bgAlpha;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.globalAlpha = 1;

    this.outerRotation += speed * 0.005 + bass * 0.008 * sensitivity;

    const cx      = this.width / 2;
    const cy      = this.height / 2;
    const minDim  = Math.min(this.width, this.height);
    const outerR  = minDim * 0.26;
    const glowBlur = glow * 20;

    ctx.save();
    ctx.translate(cx, cy);

    // ── Outer base ring (0.2 opacity guide circle) ───────────────────────────
    ctx.strokeStyle = hexAlpha(primaryColor, 0.2);
    ctx.lineWidth   = Math.max(1, this.width * 0.001);
    ctx.shadowBlur  = 0;
    ctx.beginPath();
    ctx.arc(0, 0, outerR, 0, Math.PI * 2);
    ctx.stroke();

    // ── Frequency bars ───────────────────────────────────────────────────────
    ctx.save();
    ctx.rotate(this.outerRotation);
    const outerStep    = Math.max(1, Math.floor(bufferLength * 0.75 / OUTER_COUNT));
    const outerArcSlice = (Math.PI * 2) / OUTER_COUNT;
    const outerMaxBar  = outerR * 1.7;

    for (let i = 0; i < OUTER_COUNT; i++) {
      const freqI = Math.floor(Math.pow(i / OUTER_COUNT, 1.2) * bufferLength * 0.72) + 3;
      let sum = 0;
      for (let j = 0; j < outerStep; j++) sum += frequencyData[Math.min(freqI + j, bufferLength - 1)];
      const raw = (sum / outerStep / 255) * sensitivity;
      this.outerSmoothed[i] = this.outerSmoothed[i] * 0.82 + raw * 0.18;

      const angle  = (i / OUTER_COUNT) * Math.PI * 2 - Math.PI / 2;
      const barLen = this.outerSmoothed[i] * outerMaxBar;
      const color  = lerpColor(primaryColor, secondaryColor, i / OUTER_COUNT);

      ctx.shadowColor = color;
      ctx.shadowBlur  = glowBlur * (0.25 + this.outerSmoothed[i] * 1.5);
      ctx.fillStyle   = hexAlpha(color, 0.88);

      const a0 = angle - outerArcSlice * 0.46;
      const a1 = angle + outerArcSlice * 0.46;

      ctx.beginPath();
      ctx.arc(0, 0, outerR + barLen, a0, a1);
      ctx.arc(0, 0, outerR, a1, a0, true);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // ── Orbital particles ────────────────────────────────────────────────────
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < ORB_COUNT; i++) {
      this.orbAngles[i] += this.orbSpeeds[i] * speed * (0.8 + bass * sensitivity * 2.5);
      const r     = outerR * (1 + this.orbRadiiOff[i]);
      const ox    = Math.cos(this.orbAngles[i]) * r;
      const oy    = Math.sin(this.orbAngles[i]) * r;
      const color = lerpColor(primaryColor, secondaryColor, this.orbColorT[i]);
      const sz    = this.orbSizes[i] * (0.8 + bass * sensitivity * 0.8);

      ctx.globalAlpha = 0.5 + bass * 0.3;
      ctx.shadowColor = color;
      ctx.shadowBlur  = sz * 5 * glow;
      const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, sz * 2.5);
      g.addColorStop(0, color);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(ox, oy, sz * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur  = 0;

    // ── Spawn energy pulse on beat ────────────────────────────────────────────
    if (beat) {
      for (let p = 0; p < MAX_PULSES; p++) {
        if (!this.pulseActive[p]) {
          this.pulseActive[p] = 1;
          this.pulseAngle[p]  = Math.random() * Math.PI * 2;
          this.pulseSpeed[p]  = (0.045 + bass * 0.05 * sensitivity) * (Math.random() > 0.5 ? 1 : -1);
          this.pulseAlpha[p]  = 0.75 + bass * 0.25;
          this.pulseArc[p]    = 0.5 + bass * 0.9;
          break;
        }
      }
    }

    // ── Draw and update energy pulses ─────────────────────────────────────────
    for (let p = 0; p < MAX_PULSES; p++) {
      if (!this.pulseActive[p]) continue;
      this.pulseAngle[p] += this.pulseSpeed[p];
      this.pulseAlpha[p] -= 0.016;
      if (this.pulseAlpha[p] <= 0) { this.pulseActive[p] = 0; continue; }

      const a = this.pulseAlpha[p];
      const color = lerpColor(primaryColor, '#ffffff', a * 0.35);
      ctx.globalCompositeOperation = 'screen';
      ctx.strokeStyle = hexAlpha(color, a);
      ctx.lineWidth   = 2.5 + a * 2;
      ctx.shadowColor = color;
      ctx.shadowBlur  = glow * 22 * a;
      ctx.beginPath();
      const arcEnd = this.pulseAngle[p] + this.pulseArc[p] * Math.sign(this.pulseSpeed[p]);
      ctx.arc(0, 0, outerR + 3, this.pulseAngle[p], arcEnd);
      ctx.stroke();
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;

    // ── Center orb ────────────────────────────────────────────────────────────
    const orbR = minDim * (0.048 + volume * 0.035 * sensitivity + (beat ? 0.018 : 0));
    ctx.shadowColor = primaryColor;
    ctx.shadowBlur  = glow * 40 + volume * 50 * sensitivity;
    const orbGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, orbR);
    orbGrad.addColorStop(0,   hexAlpha(primaryColor, 1));
    orbGrad.addColorStop(0.5, hexAlpha(primaryColor, 0.6));
    orbGrad.addColorStop(1,   'transparent');
    ctx.fillStyle = orbGrad;
    ctx.beginPath();
    ctx.arc(0, 0, orbR, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  destroy() { this.ctx = null; }
}
