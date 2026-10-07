export type Point = { x: number; y: number };
export type Gaze = Point & { leftX: number; leftY: number; rightX: number; rightY: number };
type FaceBounds = Pick<DOMRect, "left" | "top" | "width" | "height">;

export const IDLE: Gaze = { x: 0, y: 0, leftX: 0, leftY: 0, rightX: 0, rightY: 0 };
export const EYE_ANGLE = 18;
const CELL_SIZE = 512;

/** Coordenadas dos olhos em cada pose aberta do atlas aprovado. */
export const POSE_EYES = [
  [
    { x: 194.6, y: 243.1 },
    { x: 334.2, y: 269.8 },
  ],
  [
    { x: 683, y: 243.1 },
    { x: 822.2, y: 269.8 },
  ],
  [
    { x: 1193.5, y: 243.1 },
    { x: 1332.2, y: 269.8 },
  ],
  [
    { x: 682.5, y: 742 },
    { x: 821.9, y: 768.4 },
  ],
  [
    { x: 1191.8, y: 742.1 },
    { x: 1331.7, y: 768.4 },
  ],
] as const;

export const EYE_SHAPES = [
  { rx: 38.5, ry: 49.5, pupilRx: 24.5, pupilRy: 35.5 },
  { rx: 41.5, ry: 51.3, pupilRx: 27.5, pupilRy: 37.3 },
] as const;

/** A borda curva e o traço também precisam sair do recorte quando a pálpebra abre. */
export function eyelidOffset(ry: number, closed: number) {
  return (2 * ry + 8) * (Math.min(1, Math.max(0, closed)) - 1);
}

/** Cada olho mira o mesmo ponto; o limite se aproxima suavemente, sem saturar de repente. */
export function gazeAt(bounds: FaceBounds, point: Point): Gaze {
  const depth = Math.max(24, bounds.width * 0.42);
  function direction(eye: Point): Point {
    const dx = point.x - (bounds.left + (bounds.width * eye.x) / CELL_SIZE);
    const dy = point.y - (bounds.top + (bounds.height * eye.y) / CELL_SIZE);
    const distance = Math.hypot(dx, dy, depth);
    return { x: dx / distance, y: dy / distance };
  }
  const left = direction(POSE_EYES[0][0]);
  const right = direction(POSE_EYES[0][1]);
  return {
    x: (left.x + right.x) / 2,
    y: (left.y + right.y) / 2,
    leftX: left.x,
    leftY: left.y,
    rightX: right.x,
    rightY: right.y,
  };
}

/** Compensa a inclinação do desenho e mantém uma margem até a borda do olho. */
export function pupilOffset(
  gaze: Point,
  eye: (typeof EYE_SHAPES)[number],
  scale: number,
  tilt: number,
): Point {
  const angle = ((EYE_ANGLE + tilt) * Math.PI) / 180;
  const reach = Math.max(1, Math.hypot(gaze.x, gaze.y));
  const x = gaze.x / reach;
  const y = gaze.y / reach;
  const marginX = Math.max(0, eye.rx - eye.pupilRx * scale - 1.5);
  const marginY = Math.max(0, eye.ry - eye.pupilRy * scale - 1.5);
  return {
    x: (x * Math.cos(angle) + y * Math.sin(angle)) * marginX,
    y: (-x * Math.sin(angle) + y * Math.cos(angle)) * marginY,
  };
}
