/** 4-octave fractal Brownian motion via phase-shifted sines. Returns ≈ ±1. */
export function fbm(x: number, t: number): number {
  return (
    Math.sin(x * 1.10 + t * 0.60) * 0.500 +
    Math.sin(x * 2.30 - t * 0.90) * 0.250 +
    Math.sin(x * 4.70 + t * 1.40) * 0.125 +
    Math.sin(x * 9.30 - t * 2.10) * 0.063
  );
}

/**
 * One spring physics step.
 * Asymmetric: pass different stiffness when rising vs falling.
 * Returns [newPosition, newVelocity].
 */
export function spring(
  pos: number,
  vel: number,
  target: number,
  stiffness = 0.22,
  damping   = 0.70,
): [number, number] {
  const v = (vel + (target - pos) * stiffness) * damping;
  return [pos + v, v];
}

export function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [168, 85, 247];
}

export function hexAlpha(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${Math.min(1, Math.max(0, a)).toFixed(3)})`;
}

export function lerpColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return `rgb(${Math.round(ar + (br - ar) * t)},${Math.round(ag + (bg - ag) * t)},${Math.round(ab + (bb - ab) * t)})`;
}
