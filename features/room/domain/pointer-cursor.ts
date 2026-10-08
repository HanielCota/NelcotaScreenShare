/** Point on the shared screen, as fractions (0–1) of the image. */
export interface CursorPosition {
  x: number;
  y: number;
}

const DIRECTIONS: Partial<Record<string, readonly [number, number]>> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

const STEP = 0.05;
const FINE_STEP = 0.01;

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Keyboard cursor for pointing without a mouse: arrows move it (Shift moves
 * finer) and it never leaves the image. `undefined` for any other key.
 */
export function moveCursor(
  cursor: CursorPosition,
  key: string,
  fine: boolean,
): CursorPosition | undefined {
  const direction = DIRECTIONS[key];
  if (!direction) return undefined;
  const step = fine ? FINE_STEP : STEP;
  return { x: clamp(cursor.x + direction[0] * step), y: clamp(cursor.y + direction[1] * step) };
}
