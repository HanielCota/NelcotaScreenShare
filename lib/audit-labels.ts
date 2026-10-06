/** Rótulos em pt-BR das ações do audit log (a desconhecida aparece como está). */
const ACTION_LABELS: Record<string, string> = {
  "auth.sign_in": "Entrou no painel",
  "auth.sign_in_failed": "Login recusado",
  "auth.lockout": "Conta bloqueada por tentativas",
  "auth.two_factor_enabled": "Ativou o 2FA",
  "auth.two_factor_disabled": "Desativou o 2FA",
  "auth.password_changed": "Trocou a senha",
  "auth.password_reset": "Redefiniu a senha",
  "admin_invitation.accept": "Aceitou convite de admin",
  "admin_session.revoke": "Encerrou uma sessão",
  "admin_session.revoke_others": "Encerrou as outras sessões",
  "settings.update": "Alterou configurações",
  "audit.export": "Exportou o audit log",
  "user.self_delete": "Excluiu a própria conta",
};

const RESOURCE_LABELS: Record<string, string> = {
  admin_user: "Admin",
  admin_session: "Sessão de admin",
  admin_invitation: "Convite de admin",
  app_settings: "Configuração",
  audit_logs: "Audit log",
  user: "Participante",
};

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

export function resourceLabel(resourceType: string): string {
  return RESOURCE_LABELS[resourceType] ?? resourceType;
}
