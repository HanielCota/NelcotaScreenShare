import { expect, test } from "vitest";
import { noticeFor } from "@/lib/notice";

const NOTICES = { saiu: "Você saiu." };

test("only the page's own notice keys show a message", () => {
  expect(noticeFor(NOTICES, "saiu")).toBe("Você saiu.");
  expect(noticeFor(NOTICES, "constructor")).toBeUndefined();
  expect(noticeFor(NOTICES, "toString")).toBeUndefined();
  expect(noticeFor(NOTICES, undefined)).toBeUndefined();
  expect(noticeFor(NOTICES, ["saiu"])).toBeUndefined();
});
