import { expect, test } from "vitest";
import { CHAT_GROUP_GAP_MS, chatGroupStarts, chatParts } from "@/features/room/domain/chat-format";

test("groups consecutive messages from the same person up to the gap limit", () => {
  expect(
    chatGroupStarts([
      { author: "ana", timestamp: 0 },
      { author: "ana", timestamp: 1000 },
      { author: "bia", timestamp: 2000 },
      { author: "bia", timestamp: 2000 + CHAT_GROUP_GAP_MS + 1 },
      { author: undefined, timestamp: 3 * CHAT_GROUP_GAP_MS },
    ]),
  ).toEqual([true, false, true, true, true]);
});

test("splits links from text and leaves trailing punctuation out of the link", () => {
  expect(chatParts("veja https://exemplo.com/a?b=1, e depois http://x.dev.")).toEqual([
    { type: "text", value: "veja " },
    { type: "link", value: "https://exemplo.com/a?b=1" },
    { type: "text", value: ", e depois " },
    { type: "link", value: "http://x.dev" },
    { type: "text", value: "." },
  ]);
  expect(chatParts("sem link")).toEqual([{ type: "text", value: "sem link" }]);
  expect(chatParts("javascript:alert(1)")).toEqual([
    { type: "text", value: "javascript:alert(1)" },
  ]);
});
