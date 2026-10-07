import { describe, expect, it } from "vitest";
import {
  availableActions,
  type ParticipantState,
} from "@/features/admin/participants/available-actions";

const ALL = { update: true, delete: true, anonymize: true };
const base: ParticipantState = {
  status: "ativo",
  verified: true,
  anonymized: false,
  sessions: 0,
  can: ALL,
};

describe("ações do detalhe do participante", () => {
  it("ativo: bloquear, excluir e anonimizar", () => {
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

  it("bloqueado com sessões e sem e-mail confirmado", () => {
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

  it("excluído: só restaurar (se não anonimizado) e anonimizar", () => {
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

  it("leitor (sem permissão) não vê nenhuma ação", () => {
    const none = availableActions({
      ...base,
      can: { update: false, delete: false, anonymize: false },
    });
    expect(Object.values(none).some(Boolean)).toBe(false);
  });
});
