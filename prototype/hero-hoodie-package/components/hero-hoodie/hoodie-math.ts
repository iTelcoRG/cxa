/**
 * hoodie-math.ts
 *
 * Pure, framework-free helpers for the rotation timeline. Kept separate
 * from any React/R3F code so they're trivially unit-testable.
 */
import { ROTATION_KEYFRAMES } from "./hoodie-config";
import type { ScrollPosition } from "./hoodie-types";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Piecewise-linear interpolation of garment yaw (degrees) across the
 *  rotation timeline for a given scroll progress in [0, 1]. */
export function angleForProgress(progress: number): number {
  const p = clamp01(progress);
  const kf = ROTATION_KEYFRAMES;
  for (let i = 0; i < kf.length - 1; i++) {
    const a = kf[i];
    const b = kf[i + 1];
    if (p >= a.progress && p <= b.progress) {
      const span = b.progress - a.progress;
      const t = span === 0 ? 0 : (p - a.progress) / span;
      return a.angleDeg + (b.angleDeg - a.angleDeg) * t;
    }
  }
  return kf[kf.length - 1].angleDeg;
}

/** Named position for a given scroll progress, by nearest keyframe. */
export function positionForProgress(progress: number): ScrollPosition {
  const p = clamp01(progress);
  let closest = ROTATION_KEYFRAMES[0];
  let bestDist = Infinity;
  for (const k of ROTATION_KEYFRAMES) {
    const d = Math.abs(k.progress - p);
    if (d < bestDist) {
      bestDist = d;
      closest = k;
    }
  }
  return closest.position;
}

/** Named position for an arbitrary (possibly unwrapped, e.g. 725deg)
 *  garment yaw, by shortest circular angular distance. Used to derive
 *  the active position while the user is free-dragging rather than
 *  scroll-driven. */
export function nearestPositionForAngle(angleDeg: number): ScrollPosition {
  const wrapped = ((angleDeg % 360) + 360) % 360;
  let closest = ROTATION_KEYFRAMES[0];
  let bestDist = Infinity;
  for (const k of ROTATION_KEYFRAMES) {
    const kWrapped = ((k.angleDeg % 360) + 360) % 360;
    const raw = Math.abs(kWrapped - wrapped);
    const d = Math.min(raw, 360 - raw);
    if (d < bestDist) {
      bestDist = d;
      closest = k;
    }
  }
  return closest.position;
}

export function angleForPosition(position: ScrollPosition): number {
  const kf = ROTATION_KEYFRAMES.find((k) => k.position === position);
  return kf ? kf.angleDeg : 0;
}

/** Frame-rate independent exponential damping toward `target`, always
 *  taking the shortest path around the circle. `current` is allowed to
 *  drift outside [0, 360) over a long session (e.g. after several full
 *  spins) -- that's fine, it's only ever consumed via degToRad(). */
export function dampAngleDeg(
  current: number,
  target: number,
  lambda: number,
  dt: number
): number {
  const delta = (((target - current + 540) % 360) + 360) % 360 - 180;
  const decay = 1 - Math.exp(-lambda * dt);
  return current + delta * decay;
}

export const ORDERED_POSITIONS: ScrollPosition[] = ROTATION_KEYFRAMES
  // dedupe FRONT (appears at both progress 0 and 1)
  .filter((k, i, arr) => arr.findIndex((x) => x.position === k.position) === i)
  .map((k) => k.position);
