import { describe, expect, it } from "vitest";
import { moveCursor } from "@/features/room/domain/pointer-cursor";

describe("keyboard cursor on the shared screen", () => {
  it("arrows move it, Shift moves finer, other keys do nothing", () => {
    const center = { x: 0.5, y: 0.5 };
    expect(moveCursor(center, "ArrowRight", false)).toEqual({ x: 0.55, y: 0.5 });
    expect(moveCursor(center, "ArrowUp", true)).toEqual({ x: 0.5, y: 0.49 });
    expect(moveCursor(center, "a", false)).toBeUndefined();
  });

  it("never leaves the image", () => {
    expect(moveCursor({ x: 0, y: 1 }, "ArrowLeft", false)).toEqual({ x: 0, y: 1 });
    expect(moveCursor({ x: 0, y: 1 }, "ArrowDown", false)).toEqual({ x: 0, y: 1 });
  });
});
