import assert from "node:assert/strict";
import { test } from "vitest";
import { parseRoomInput } from "@/lib/room-input";

const INVITE = "a".repeat(43);

test("vazio cria sala; código solto entra (em minúsculas)", () => {
  assert.deepEqual(parseRoomInput("   "), { kind: "empty" });
  assert.deepEqual(parseRoomInput(" KFA-mtrx-Q2P "), { kind: "room", code: "kfa-mtrx-q2p" });
});

test("link colado: com protocolo, sem protocolo, só o caminho e com convite", () => {
  const room = { kind: "room", code: "kfa-mtrx-q2p" };
  assert.deepEqual(parseRoomInput("https://nelcota.app/sala/kfa-mtrx-q2p"), room);
  assert.deepEqual(parseRoomInput("nelcota.app/sala/kfa-mtrx-q2p"), room);
  assert.deepEqual(parseRoomInput("/sala/kfa-mtrx-q2p"), room);
  assert.deepEqual(parseRoomInput("Entra aí: https://nelcota.app/sala/kfa-mtrx-q2p"), room);
  assert.deepEqual(parseRoomInput(`https://nelcota.app/sala/kfa-mtrx-q2p?convite=${INVITE}`), {
    ...room,
    invite: INVITE,
  });
  assert.deepEqual(
    parseRoomInput("https://nelcota.app/sala/kfa-mtrx-q2p?convite=curto"),
    room,
    "convite fora do formato é ignorado",
  );
});

test("o que não é sala", () => {
  assert.deepEqual(parseRoomInput("https://youtube.com/watch?v=x"), {
    kind: "invalid",
    reason: "not-a-room",
  });
  assert.deepEqual(parseRoomInput("oi tudo bem"), { kind: "invalid", reason: "bad-code" });
  assert.deepEqual(parseRoomInput("/sala/%E0%A4%A"), { kind: "invalid", reason: "bad-code" });
  assert.deepEqual(parseRoomInput("/sala/a"), { kind: "invalid", reason: "bad-code" });
});
