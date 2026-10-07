import type { TokenErrorCode } from "./token-contract";

/** O que a pré-entrada entrega para a sala. */
export interface JoinChoices {
  /** Só em memória: o "Tentar de novo" da sala pede um token novo com ela. */
  password?: string;
  token: string;
  serverUrl: string;
  micEnabled: boolean;
  audioDeviceId?: string;
}

/** O que fazer quando o pedido de token falha na pré-entrada. */
export interface JoinFailure {
  /** Sessão expirou ou e-mail não confirmado: sai para a tela certa e volta depois. */
  redirect?: "login" | "verify-email";
  /** Erro marcado no campo de senha (e foco nele). */
  passwordField: boolean;
  /** Erro da tentativa (senha, dados) deixa bravo; falha de servidor ou rede, preocupado. */
  mood: "grumpy" | "worried";
}

export function joinFailure(code: TokenErrorCode | "network_error"): JoinFailure {
  if (code === "unauthenticated")
    return { redirect: "login", passwordField: false, mood: "worried" };
  if (code === "email_unverified") {
    return { redirect: "verify-email", passwordField: false, mood: "worried" };
  }
  if (code === "invalid_password") return { passwordField: true, mood: "grumpy" };
  if (code === "invalid_request") return { passwordField: false, mood: "grumpy" };
  return { passwordField: false, mood: "worried" };
}

/** "Quem já está lá dentro": responde "estou no lugar certo? já começou?". */
export type Presence =
  | { kind: "full"; text: string }
  | { kind: "empty"; text: string }
  | { kind: "some"; text: string };

export function presenceText(online: number, max: number): Presence {
  if (online >= max) {
    return {
      kind: "full",
      text: `A sala está cheia (${online} de ${max} pessoas). Aguarde alguém sair.`,
    };
  }
  if (online === 0) {
    return { kind: "empty", text: "Ninguém na sala ainda: você será a primeira pessoa." };
  }
  return {
    kind: "some",
    text: online === 1 ? "1 pessoa já está na sala" : `${online} pessoas já estão na sala`,
  };
}
