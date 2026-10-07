import { DisconnectReason } from "livekit-client";
import { expect, test } from "vitest";
import { disconnectReason } from "@/features/room/client/connection-errors";
import { callDuration, formatCallDuration } from "@/features/room/domain/leave";

test("duração da chamada em texto curto", () => {
  expect(formatCallDuration(30_000)).toBe("menos de 1 min");
  expect(formatCallDuration(-5)).toBe("menos de 1 min");
  expect(formatCallDuration(42 * 60_000 + 59_000)).toBe("42 min");
  expect(formatCallDuration(65 * 60_000)).toBe("1 h 05 min");
});

test("sem hora de entrada conhecida, não há duração (nunca NaN)", () => {
  expect(callDuration(1000, 61_000)).toBe(60_000);
  expect(callDuration(undefined, 61_000)).toBeUndefined();
  expect(callDuration(Number.NaN, 61_000)).toBeUndefined();
  expect(callDuration(5000, 1000)).toBe(0);
});

test("motivo da queda decide o título e as ações da tela de saída", () => {
  expect(disconnectReason(DisconnectReason.DUPLICATE_IDENTITY)).toBe("elsewhere");
  expect(disconnectReason(DisconnectReason.PARTICIPANT_REMOVED)).toBe("removed");
  expect(disconnectReason(DisconnectReason.ROOM_DELETED)).toBe("ended");
  expect(disconnectReason(DisconnectReason.ROOM_CLOSED)).toBe("ended");
  expect(disconnectReason(DisconnectReason.SIGNAL_CLOSE)).toBe("dropped");
  expect(disconnectReason(undefined)).toBe("dropped");
});
