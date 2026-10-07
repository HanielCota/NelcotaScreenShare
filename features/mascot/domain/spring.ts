/** Maximum simulation step: stable even when the browser throttles to 30 frames per second. */
const MAX_STEP = 1 / 120;

/**
 * Advances a critically damped spring (no bounce) per key; tells whether everything has settled.
 * `response` is the response time in seconds, as in Apple's springs (may vary per key).
 *
 * The frame interval is split into small steps: with a single step, fast springs (like the
 * gaze's) become unstable below ~38 frames per second and the values blow up.
 */
export function springStep<K extends string>(
  value: Record<K, number>,
  velocity: Record<K, number>,
  target: Readonly<Record<K, number>>,
  response: number | ((key: K) => number),
  dt: number,
): boolean {
  let settled = true;
  for (const key in target) {
    const omega = (2 * Math.PI) / (typeof response === "number" ? response : response(key));
    for (let remaining = dt; remaining > 0; remaining -= MAX_STEP) {
      const h = Math.min(remaining, MAX_STEP);
      const acceleration = -omega * omega * (value[key] - target[key]) - 2 * omega * velocity[key];
      velocity[key] += acceleration * h;
      value[key] += velocity[key] * h;
    }
    // Safety net: an invalid value never reaches the drawing; it snaps back to the target.
    if (!Number.isFinite(value[key]) || !Number.isFinite(velocity[key])) {
      value[key] = target[key];
      velocity[key] = 0;
    }
    if (Math.abs(value[key] - target[key]) > 0.002 || Math.abs(velocity[key]) > 0.01) {
      settled = false;
    }
  }
  return settled;
}
