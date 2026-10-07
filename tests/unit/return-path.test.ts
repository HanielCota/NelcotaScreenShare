import { describe, expect, it } from "vitest";
import { safeReturnPath } from "@/lib/return-path";

describe("safeReturnPath", () => {
  it("aceita caminhos internos como vieram", () => {
    expect(safeReturnPath("/sala/abc-defg-hij?convite=x")).toBe("/sala/abc-defg-hij?convite=x");
    expect(safeReturnPath("/conta")).toBe("/conta");
    expect(safeReturnPath("/")).toBe("/");
  });

  it("recusa o que não é caminho interno", () => {
    expect(safeReturnPath(undefined)).toBe("/");
    expect(safeReturnPath(["/conta"])).toBe("/");
    expect(safeReturnPath("https://evil.com")).toBe("/");
    expect(safeReturnPath("sala/abc")).toBe("/");
    expect(safeReturnPath("//evil.com")).toBe("/");
    expect(safeReturnPath("/\\evil.com")).toBe("/");
  });

  it("recusa caracteres que o parser de URL descarta (open redirect)", () => {
    expect(safeReturnPath("/\t/evil.com")).toBe("/");
    expect(safeReturnPath("/\n/evil.com")).toBe("/");
    expect(safeReturnPath("/\r/evil.com")).toBe("/");
    expect(safeReturnPath("/\\\t\\evil.com")).toBe("/");
  });

  it("não volta para a API nem para o painel", () => {
    expect(safeReturnPath("/api/token")).toBe("/");
    expect(safeReturnPath("/admin")).toBe("/");
    expect(safeReturnPath("/admin/salas")).toBe("/");
  });

  it("usa o fallback pedido", () => {
    expect(safeReturnPath("//evil.com", "")).toBe("");
  });
});
