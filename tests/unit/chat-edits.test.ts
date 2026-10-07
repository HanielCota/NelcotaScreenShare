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

test("the author edits and deletes their own message", () => {
  const edited = recordChatEdit(empty, { type: "edit", id: "m1", text: "oi" }, "ana");
  expect(resolveChatText(edited, message)).toEqual({ text: "oi", edited: true, deleted: false });

  const deleted = recordChatEdit(edited, { type: "delete", id: "m1" }, "ana");
  expect(resolveChatText(deleted, message)).toEqual({ text: "", edited: false, deleted: true });
});

test("a change from someone else does not affect the message", () => {
  const edits = recordChatEdit(empty, { type: "delete", id: "m1" }, "bia");
  expect(resolveChatText(edits, message)).toEqual({
    text: "senha 1234",
    edited: false,
    deleted: false,
  });
  // And it does not get in the way of the legitimate change that arrives later.
  const legit = recordChatEdit(edits, { type: "edit", id: "m1", text: "oi" }, "ana");
  expect(resolveChatText(legit, message).text).toBe("oi");
});

test("deleting is final and editing without changing the text does not mark it edited", () => {
  const deleted = recordChatEdit(empty, { type: "delete", id: "m1" }, "ana");
  const after = recordChatEdit(deleted, { type: "edit", id: "m1", text: "voltei" }, "ana");
  expect(resolveChatText(after, message).deleted).toBe(true);

  const same = recordChatEdit(empty, { type: "edit", id: "m1", text: "senha 1234" }, "ana");
  expect(resolveChatText(same, message).edited).toBe(false);
});

test("validates the notice received over the data channel", () => {
  const valid = encodeMessage({ type: "edit", id: "m1", text: "  oi  " });
  expect(decodeMessage(valid, chatEditSchema)).toEqual({ type: "edit", id: "m1", text: "oi" });
  expect(
    decodeMessage(encodeMessage({ type: "edit", id: "m1", text: "   " }), chatEditSchema),
  ).toBeUndefined();
  expect(decodeMessage(encodeMessage({ type: "wipe", id: "m1" }), chatEditSchema)).toBeUndefined();
});
