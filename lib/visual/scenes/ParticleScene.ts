import type { VisualScene, SceneConfig } from '@/types/visual';
import type { AudioAnalysisData } from '@/types/audio';
import { hexAlpha, hexToRgb, lerpColor } from '@/lib/visual/utils';

// ─── Particle types ──────────────────────────────────────────────────────────
//  0 = bass  — radial explosions from center on beat, large and fast
//  1 = mid   — continuous spiral arms orbiting the center
//  2 = high  — glitter sparks, tiny and fast, scattered everywhere

const POOL = 1000;

export class ParticleScene implements VisualScene {
  readonly type = 'particles' as const;
  private ctx: CanvasRenderingContext2D | null = null;
  private width = 0;
  private height = 0;

  // Structure-of-arrays particle pool
  private active = new Uint8Array(POOL);
  private px     = new Float32Array(POOL);
  private py     = new Float32Array(POOL);
  private pvx    = new Float32Array(POOL);
  private pvy    = new Float32Array(POOL);
  private ppx    = new Float32Array(POOL); // previous position for trail
  private ppy    = new Float32Array(POOL);
  private plife  = new Float32Array(POOL); // 1.0 → 0
  private pdecay = new Float32Array(POOL); // life lost per frame
  private psize  = new Float32Array(POOL);
  private pr     = new Float32Array(POOL); // color r 0-255
  private pg     = new Float32Array(POOL);
  private pb     = new Float32Array(POOL);
  private ptype  = new Uint8Array(POOL);   // 0/1/2

  private spawnHead = 0;        // pool allocation cursor
  private midAngle  = 0;        // rotating angle for spiral spawn
  private burstFlash = 0;       // brief radial burst lines on beat

  init(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
  }

  resize(w: number, h: number) { this.width = w; this.height = h; }

  private spawn(
    x: number, y: number, vx: number, vy: number,
    decay: number, size: number,
    r: number, g: number, b: number,
    type: 0 | 1 | 2,
  ) {
    for (let i = 0; i < POOL; i++) {
      const idx = (this.spawnHead + i) % POOL;
      if (!this.active[idx]) {
        this.spawnHead    = (idx + 1) % POOL;
        this.active[idx]  = 1;
        this.px[idx]      = x;   this.py[idx]  = y;
        this.pvx[idx]     = vx;  this.pvy[idx] = vy;
        this.ppx[idx]     = x;   this.ppy[idx] = y;
        this.plife[idx]   = 1;
        this.pdecay[idx]  = decay;
        this.psize[idx]   = size;
        this.pr[idx] = r; this.pg[idx] = g; this.pb[idx] = b;
        this.ptype[idx]   = type;
        return;
      }
    }
  }

  update(analysis: AudioAnalysisData, config: SceneConfig) {
    const ctx = this.ctx;
    if (!ctx) return;
    const { bass, mid, treble, beat } = analysis;
    const { primaryColor, secondaryColor, backgroundColor, sensitivity, glow, trail, speed, particleSize } = config;

    const bgAlpha = 0.05 + (1 - trail) * 0.55;
    ctx.fillStyle = backgroundColor;
    ctx.globalAlpha = bgAlpha;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.globalAlpha = 1;

    const cx = this.width / 2;
    const cy = this.height / 2;
    const sizeBase = Math.min(this.width, this.height) * 0.005 * (0.5 + particleSize * 1.5);

    const [pr, pg, pb] = hexToRgb(primaryColor);
    const [sr, sg, sb] = hexToRgb(secondaryColor);

    // ── Bass: radial explosion on beat ───────────────────────────────────────
    if (beat) {
      const count = Math.floor(30 + bass * 22 * sensitivity);
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * Math.PI * 2 + Math.random() * 0.3;
        const spd = (4 + Math.random() * 9) * speed * (0.8 + bass * sensitivity);
        this.spawn(
          cx + (Math.random() - 0.5) * 20,
          cy + (Math.random() - 0.5) * 20,
          Math.cos(ang) * spd, Math.sin(ang) * spd,
          0.012 + Math.random() * 0.006,
          sizeBase * (2 + Math.random() * 2.5),
          pr, pg, pb, 0,
        );
      }
      this.burstFlash = 1;
    }
    this.burstFlash *= 0.75;

    // ── Mid: continuous spiral arms ──────────────────────────────────────────
    if (mid > 0.1) {
      this.midAngle += speed * 0.07 + mid * sensitivity * 0.14;
      const spiralCount = Math.ceil(mid * sensitivity * 3);
      for (let i = 0; i < spiralCount; i++) {
        const ang = this.midAngle + (i / spiralCount) * Math.PI * 2;
        const r   = 35 + mid * 65 * sensitivity;
        const sx  = cx + Math.cos(ang) * r;
        const sy  = cy + Math.sin(ang) * r;
        // Tangential velocity creates the spiral
        const tang = ang + Math.PI / 2;
        const spd  = 1.2 * mid * sensitivity * speed;
        this.spawn(
          sx, sy,
          Math.cos(tang) * spd + Math.cos(ang) * 0.4,
          Math.sin(tang) * spd + Math.sin(ang) * 0.4,
          0.007 + Math.random() * 0.004,
          sizeBase * (0.8 + Math.random() * 1.5),
          sr, sg, sb, 1,
        );
      }
    }

    // ── High: glitter sparks ─────────────────────────────────────────────────
    if (treble > 0.15) {
      const count = Math.ceil(treble * sensitivity * 8);
      for (let i = 0; i < count; i++) {
        const ang  = Math.random() * Math.PI * 2;
        const dist = Math.random() * Math.min(this.width, this.height) * 0.35;
        this.spawn(
          cx + Math.cos(ang) * dist,
          cy + Math.sin(ang) * dist,
          (Math.random() - 0.5) * 2.5 * treble * sensitivity * speed,
          -Math.random() * 2.5 * treble * sensitivity * speed - 0.3,
          0.028 + Math.random() * 0.012,
          sizeBase * (0.3 + Math.random() * 0.7),
          // Glitter: blend primary → white
          Math.round(pr + (255 - pr) * 0.6),
          Math.round(pg + (255 - pg) * 0.6),
          Math.round(pb + (255 - pb) * 0.6),
          2,
        );
      }
    }

    // ── Beat burst lines (immediate visual impact) ────────────────────────────
    if (this.burstFlash > 0.1) {
      ctx.globalCompositeOperation = 'screen';
      const lines = 8;
      for (let l = 0; l < lines; l++) {
        const ang  = (l / lines) * Math.PI * 2;
        const len  = (60 + bass * 100 * sensitivity) * this.burstFlash;
        ctx.strokeStyle = hexAlpha(primaryColor, this.burstFlash * 0.5);
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    // ── Update and draw all active particles ─────────────────────────────────
    ctx.globalCompositeOperation = 'screen';

    for (let i = 0; i < POOL; i++) {
      if (!this.active[i]) continue;

      // Save prev for trail
      this.ppx[i] = this.px[i];
      this.ppy[i] = this.py[i];

      // Physics by type
      if (this.ptype[i] === 0) {
        // Bass: gravity + friction
        this.pvy[i] += 0.08 * speed;
        this.pvx[i] *= 0.985;
        this.pvy[i] *= 0.985;
      } else if (this.ptype[i] === 1) {
        // Mid: weak inward pull + slight turbulence
        const dx = cx - this.px[i];
        const dy = cy - this.py[i];
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;
        this.pvx[i] += (dx / dist) * 0.012;
        this.pvy[i] += (dy / dist) * 0.012;
        this.pvx[i] *= 0.99;
        this.pvy[i] *= 0.99;
      } else {
        // High: float upward, slight drift
        this.pvx[i] += (Math.random() - 0.5) * 0.15;
        this.pvy[i] *= 0.97;
      }

      this.px[i]    += this.pvx[i];
      this.py[i]    += this.pvy[i];
      this.plife[i] -= this.pdecay[i];

      if (this.plife[i] <= 0) { this.active[i] = 0; continue; }

      const life  = this.plife[i];
      const r     = this.pr[i];
      const g     = this.pg[i];
      const b_c   = this.pb[i];
      const sz    = this.psize[i] * life;
      const alpha = Math.pow(life, 0.65);

      // Trail line from previous to current position
      ctx.strokeStyle = `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b_c)},${(alpha * 0.35).toFixed(3)})`;
      ctx.lineWidth   = sz * 0.8;
      ctx.shadowBlur  = 0;
      ctx.beginPath();
      ctx.moveTo(this.ppx[i], this.ppy[i]);
      ctx.lineTo(this.px[i], this.py[i]);
      ctx.stroke();

      // Core dot with glow
      ctx.globalAlpha = alpha;
      ctx.shadowColor = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b_c)})`;
      ctx.shadowBlur  = sz * 3 * glow;
      const grad = ctx.createRadialGradient(this.px[i], this.py[i], 0, this.px[i], this.py[i], sz * 2);
      grad.addColorStop(0, `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b_c)},1)`);
      grad.addColorStop(0.5, `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b_c)},0.4)`);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(this.px[i], this.py[i], sz * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur  = 0;
    ctx.globalCompositeOperation = 'source-over';
  }

  destroy() {
    this.ctx = null;
    this.active.fill(0);
  }
}
