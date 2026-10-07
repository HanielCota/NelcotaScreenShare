import { describe, expect, it } from "vitest";
import { safeReturnPath } from "@/features/auth/domain/return-path";

describe("safeReturnPath", () => {
  it("accepts internal paths as given", () => {
    expect(safeReturnPath("/sala/abc-defg-hij?convite=x")).toBe("/sala/abc-defg-hij?convite=x");
    expect(safeReturnPath("/conta")).toBe("/conta");
    expect(safeReturnPath("/")).toBe("/");
  });

  it("rejects anything that is not an internal path", () => {
    expect(safeReturnPath(undefined)).toBe("/");
    expect(safeReturnPath(["/conta"])).toBe("/");
    expect(safeReturnPath("https://evil.com")).toBe("/");
    expect(safeReturnPath("sala/abc")).toBe("/");
    expect(safeReturnPath("//evil.com")).toBe("/");
    expect(safeReturnPath("/\\evil.com")).toBe("/");
  });

  it("rejects characters the URL parser drops (open redirect)", () => {
    expect(safeReturnPath("/\t/evil.com")).toBe("/");
    expect(safeReturnPath("/\n/evil.com")).toBe("/");
    expect(safeReturnPath("/\r/evil.com")).toBe("/");
    expect(safeReturnPath("/\\\t\\evil.com")).toBe("/");
  });

  it("does not return to the API or the admin panel", () => {
    expect(safeReturnPath("/api/token")).toBe("/");
    expect(safeReturnPath("/admin")).toBe("/");
    expect(safeReturnPath("/admin/salas")).toBe("/");
  });

  it("uses the requested fallback", () => {
    expect(safeReturnPath("//evil.com", "")).toBe("");
  });
});
