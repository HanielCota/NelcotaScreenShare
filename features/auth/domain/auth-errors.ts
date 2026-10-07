/**
 * pt-BR messages for Better Auth errors. Sign-in and recovery always use
 * the same sentence for a nonexistent e-mail and a wrong password (they do not
 * reveal who has an account).
 */
const BY_CODE: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "E-mail ou senha incorretos.",
  EMAIL_NOT_VERIFIED: "Confirme seu e-mail antes de entrar. Enviamos um novo link agora.",
  USER_ALREADY_EXISTS: "Confira seu e-mail para continuar.",
  // Only with e-mail confirmation turned off (with it, the response is generic).
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
    "Já existe uma conta com esse e-mail. Entre com sua senha ou recupere a senha.",
  FAILED_TO_CREATE_SESSION: "E-mail ou senha incorretos.",
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
  // 429: the server message is already in pt-BR (lockout after attempts or rate limit).
  if (error.status === 429) {
    return error.message?.startsWith("Muitas")
      ? error.message
      : "Muitas tentativas. Aguarde um minuto.";
  }
  // Disabled account: message configured on the server, in pt-BR.
  if (error.status === 403 && error.message?.includes("desativada")) return error.message;
  return fallback ?? "Algo deu errado. Tente de novo.";
}
