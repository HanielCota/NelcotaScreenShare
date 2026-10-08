import assert from "node:assert/strict";
import { test } from "vitest";
import { newRoomHref } from "@/features/home/domain/new-room";

test("with an account, a new room opens directly", () => {
  assert.match(newRoomHref(true), /^\/sala\/[a-z0-9]{3}-[a-z0-9]{4}-[a-z0-9]{3}$/);
});

test("without an account, sign-up comes first and returns to the new room", () => {
  const href = newRoomHref(false);
  assert.match(href, /^\/cadastro\?voltar=%2Fsala%2F/);
  const back = decodeURIComponent(href.split("voltar=")[1] ?? "");
  assert.match(back, /^\/sala\/[a-z0-9]{3}-[a-z0-9]{4}-[a-z0-9]{3}$/);
});
