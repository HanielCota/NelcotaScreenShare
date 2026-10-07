import { expect, test } from "vitest";
import {
  chatEditSchema,
  recordChatEdit,
  resolveChatText,
  type ChatEdits,
} from "@/features/room/domain/chat-edits";
import { decodeMessage, encodeMessage } from "@/features/room/domain/data-channel";

const message = { id: "m1", text: "senha 1234", author: "ana" };
const empty: ChatEdits = new Map();

test("quem escreveu edita e apaga a própria mensagem", () => {
  const edited = recordChatEdit(empty, { type: "edit", id: "m1", text: "oi" }, "ana");
  expect(resolveChatText(edited, message)).toEqual({ text: "oi", edited: true, deleted: false });

  const deleted = recordChatEdit(edited, { type: "delete", id: "m1" }, "ana");
  expect(resolveChatText(deleted, message)).toEqual({ text: "", edited: false, deleted: true });
});

test("mudança de outra pessoa não afeta a mensagem", () => {
  const edits = recordChatEdit(empty, { type: "delete", id: "m1" }, "bia");
  expect(resolveChatText(edits, message)).toEqual({
    text: "senha 1234",
    edited: false,
    deleted: false,
  });
  // E não atrapalha a mudança legítima que chega depois.
  const legit = recordChatEdit(edits, { type: "edit", id: "m1", text: "oi" }, "ana");
  expect(resolveChatText(legit, message).text).toBe("oi");
});

test("apagar é definitivo e editar sem mudar o texto não marca como editada", () => {
  const deleted = recordChatEdit(empty, { type: "delete", id: "m1" }, "ana");
  const after = recordChatEdit(deleted, { type: "edit", id: "m1", text: "voltei" }, "ana");
  expect(resolveChatText(after, message).deleted).toBe(true);

  const same = recordChatEdit(empty, { type: "edit", id: "m1", text: "senha 1234" }, "ana");
  expect(resolveChatText(same, message).edited).toBe(false);
});

test("valida o aviso recebido pelo canal de dados", () => {
  const valid = encodeMessage({ type: "edit", id: "m1", text: "  oi  " });
  expect(decodeMessage(valid, chatEditSchema)).toEqual({ type: "edit", id: "m1", text: "oi" });
  expect(
    decodeMessage(encodeMessage({ type: "edit", id: "m1", text: "   " }), chatEditSchema),
  ).toBeUndefined();
  expect(decodeMessage(encodeMessage({ type: "wipe", id: "m1" }), chatEditSchema)).toBeUndefined();
});
