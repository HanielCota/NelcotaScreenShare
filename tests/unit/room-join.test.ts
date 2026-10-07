import { ConnectionError, DisconnectReason, MediaDeviceFailure } from "livekit-client";
import { describe, expect, it, vi } from "vitest";
import {
  connectErrorMessage,
  disconnectMessage,
  micErrorMessage,
} from "@/features/room/client/connection-errors";
import { pickFocusedShare } from "@/features/room/domain/focus";
import { joinFailure, presenceText } from "@/features/room/domain/join";

const share = (sid: string, isLocal = false) => ({
  publication: { trackSid: sid },
  participant: { isLocal },
});

describe("screen on stage", () => {
  it("the chosen one; else the most recent from others; own share only when alone", () => {
    const mine = share("TR_eu", true);
    const ana = share("TR_ana");
    const bia = share("TR_bia");
    expect(pickFocusedShare([ana, bia, mine], "TR_ana")).toBe(ana);
    expect(pickFocusedShare([ana, bia, mine], undefined)).toBe(bia);
    expect(pickFocusedShare([ana, bia], "TR_sumiu")).toBe(bia);
    expect(pickFocusedShare([mine], undefined)).toBe(mine);
    expect(pickFocusedShare([], undefined)).toBeUndefined();
  });
});

describe("token request failure in the pre-join screen", () => {
  it("session or e-mail: leaves to the right screen", () => {
    expect(joinFailure("unauthenticated").redirect).toBe("login");
    expect(joinFailure("email_unverified").redirect).toBe("verify-email");
  });

  it("user error makes it grumpy; server or network error, worried", () => {
    expect(joinFailure("invalid_password")).toEqual({ passwordField: true, mood: "grumpy" });
    expect(joinFailure("invalid_request")).toEqual({ passwordField: false, mood: "grumpy" });
    expect(joinFailure("room_full").mood).toBe("worried");
    expect(joinFailure("network_error").mood).toBe("worried");
  });
});

describe("who is already in the room", () => {
  it("empty, with people and full", () => {
    expect(presenceText(0, 6).kind).toBe("empty");
    expect(presenceText(1, 6).text).toBe("1 pessoa já está na sala");
    expect(presenceText(3, 6).text).toBe("3 pessoas já estão na sala");
    expect(presenceText(6, 6)).toEqual({
      kind: "full",
      text: "A sala está cheia (6 de 6 pessoas). Aguarde alguém sair.",
    });
  });
});

describe("LiveKit error messages", () => {
  it("connect failure: room full, permission, network and timeout", () => {
    expect(connectErrorMessage(ConnectionError.internal("room is full"))).toContain("cheia");
    expect(connectErrorMessage(ConnectionError.notAllowed("x", 403))).toContain("renovar o acesso");
    expect(connectErrorMessage(ConnectionError.serverUnreachable("x"))).toContain(
      "Verifique sua internet",
    );
    expect(connectErrorMessage(ConnectionError.timeout("x"))).toContain("outra rede");
    expect(connectErrorMessage(new Error("anything"))).toContain("Aguarde alguns segundos");
  });

  it("disconnect: other tab, removed, room ended; own leave without message", () => {
    expect(disconnectMessage(DisconnectReason.DUPLICATE_IDENTITY)).toContain("outra aba");
    expect(disconnectMessage(DisconnectReason.PARTICIPANT_REMOVED)).toContain("removido");
    expect(disconnectMessage(DisconnectReason.ROOM_DELETED)).toContain("encerrada");
    expect(disconnectMessage(DisconnectReason.CLIENT_INITIATED)).toBeUndefined();
  });

  it("microphone: blocked, missing and in use", () => {
    const failure = vi.spyOn(MediaDeviceFailure, "getFailure");
    failure.mockReturnValueOnce(MediaDeviceFailure.PermissionDenied);
    expect(micErrorMessage(new Error())).toContain("bloqueou");
    failure.mockReturnValueOnce(MediaDeviceFailure.NotFound);
    expect(micErrorMessage(new Error())).toContain("Nenhum microfone");
    failure.mockReturnValueOnce(MediaDeviceFailure.DeviceInUse);
    expect(micErrorMessage(new Error())).toContain("em uso");
  });
});
