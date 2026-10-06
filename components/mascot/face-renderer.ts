import type { FaceState } from "./face";
import type { Gaze } from "./gaze";
import { avatarFrame } from "./avatar-frames";
import { EYE_SHAPES, pupilOffset, eyelidOffset } from "./eye-tracking";

/** Atualiza só o desenho, sem renderizações React a cada quadro. */
export function createFaceRenderer(face: HTMLElement) {
  const sprite = face.querySelector<HTMLElement>("[data-mascot-sprite]");
  if (!sprite) return null;
  const pupils = [...sprite.querySelectorAll<SVGElement>("[data-mascot-pupil]")].map((element) => ({
    element,
    right: element.dataset.mascotEye === "1",
  }));
  const lids = [...sprite.querySelectorAll<SVGElement>("[data-mascot-lid]")];
  return {
    lids,
    render(gaze: Gaze, state: FaceState) {
      const pose = avatarFrame(face.parentElement?.dataset.expression, state.lid0, state.lid1);
      face.style.setProperty("--sprite-column", String(pose.column));
      face.style.setProperty("--sprite-row", String(pose.row));
      const tilt = state.tilt + gaze.x * 0.65;
      face.style.setProperty("--tilt", tilt.toFixed(2));
      face.style.setProperty("--rest", state.rest.toFixed(3));
      for (const lid of lids) {
        const index = lid.dataset.mascotEye === "1" ? 1 : 0;
        const closed = Math.min(1, Math.max(0, state[index === 1 ? "lid1" : "lid0"]));
        lid.setAttribute("visibility", closed > 0.002 ? "visible" : "hidden");
        lid.setAttribute(
          "transform",
          `translate(0 ${eyelidOffset(EYE_SHAPES[index].ry, closed).toFixed(2)})`,
        );
      }
      const scale = Math.min(1.05, Math.max(0.68, state.pupil));
      for (const { element, right } of pupils) {
        const direction = right
          ? { x: gaze.rightX, y: gaze.rightY }
          : { x: gaze.leftX, y: gaze.leftY };
        const { x, y } = pupilOffset(direction, EYE_SHAPES[right ? 1 : 0], scale, tilt);
        element.setAttribute(
          "transform",
          `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(3)})`,
        );
      }
    },
  };
}

export type FaceRenderer = NonNullable<ReturnType<typeof createFaceRenderer>>;
