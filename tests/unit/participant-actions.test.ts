import { describe, expect, it } from "vitest";
import {
  availableActions,
  type ParticipantState,
} from "@/features/admin/participants/domain/available-actions";

const ALL = { update: true, delete: true, anonymize: true };
const base: ParticipantState = {
  status: "ativo",
  verified: true,
  anonymized: false,
  sessions: 0,
  can: ALL,
};

describe("participant detail actions", () => {
  it("active: block, delete and anonymize", () => {
    expect(availableActions(base)).toEqual({
      unblock: false,
      block: true,
      revokeSessions: false,
      resendVerification: false,
      restore: false,
      delete: true,
      anonymize: true,
    });
  });

  it("blocked with sessions and unverified e-mail", () => {
    const actions = availableActions({
      ...base,
      status: "bloqueado",
      sessions: 2,
      verified: false,
    });
    expect(actions).toMatchObject({
      unblock: true,
      block: false,
      revokeSessions: true,
      resendVerification: true,
    });
  });

  it("deleted: only restore (if not anonymized) and anonymize", () => {
    expect(availableActions({ ...base, status: "excluido" })).toMatchObject({
      block: false,
      delete: false,
      restore: true,
      anonymize: true,
    });
    expect(availableActions({ ...base, status: "excluido", anonymized: true })).toMatchObject({
      restore: false,
      anonymize: false,
    });
  });

  it("reader (no permission) sees no action", () => {
    const none = availableActions({
      ...base,
      can: { update: false, delete: false, anonymize: false },
    });
    expect(Object.values(none).some(Boolean)).toBe(false);
  });
});
