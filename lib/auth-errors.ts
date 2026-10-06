/**
 * Mensagens em pt-BR para os erros do Better Auth. Login e recuperação usam
 * sempre a mesma frase para e-mail inexistente e senha errada (não revelam
 * quem tem conta).
 */
const BY_CODE: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "E-mail ou senha incorretos.",
  INVALID_PASSWORD: "Senha incorreta.",
  INVALID_CODE: "Código inválido ou expirado. Confira o app autenticador e tente de novo.",
  INVALID_TWO_FACTOR_COOKIE: "A verificação expirou. Entre com e-mail e senha de novo.",
  INVALID_BACKUP_CODE: "Código de backup inválido ou já usado.",
  ACCOUNT_TEMPORARILY_LOCKED: "Muitas tentativas de código. Aguarde alguns minutos.",
  INVALID_TOKEN: "Este link não vale mais. Peça um novo.",
  PASSWORD_TOO_SHORT: "A senha é curta demais.",
  PASSWORD_TOO_LONG: "A senha é longa demais.",
  SESSION_EXPIRED: "Sua sessão expirou. Entre de novo.",
  CROSS_SITE_REQUEST: "Requisição recusada. Atualize a página e tente de novo.",
  ADMIN_DISABLED: "O painel admin está desligado neste servidor.",
};

export interface AuthErrorLike {
  code?: string | undefined;
  message?: string | undefined;
  status?: number | undefined;
}

export function authErrorMessage(
  error: AuthErrorLike | null | undefined,
  fallback?: string,
): string {
  if (!error) return fallback ?? "Algo deu errado. Tente de novo.";
  if (error.code && BY_CODE[error.code]) return BY_CODE[error.code] ?? "";
  // 429: a mensagem do servidor já vem em pt-BR (bloqueio por tentativas ou rate limit).
  if (error.status === 429) {
    return error.message?.startsWith("Muitas")
      ? error.message
      : "Muitas tentativas. Aguarde um minuto.";
  }
  // Conta desativada: mensagem configurada no servidor, em pt-BR.
  if (error.status === 403 && error.message?.includes("desativada")) return error.message;
  return fallback ?? "Algo deu errado. Tente de novo.";
}
