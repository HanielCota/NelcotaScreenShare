import { accessContext } from "./access-context";

/**
 * O que o mascote diz no balão das telas de acesso. Muda com a tela e com a
 * sala de onde a pessoa veio (no lugar de slogan e lista de vantagens).
 */
export function mascotLine(pathname: string, returnTo: string | null): string {
  const context = accessContext(returnTo ?? "/");
  const room = context.kind === "room" ? context.code : undefined;
  const invited = context.kind === "room" && context.invited;

  switch (pathname) {
    case "/entrar":
      if (invited) return `Você tem convite para a sala ${room}. Entra que eu te levo até lá.`;
      if (room) return `A sala ${room} já está te esperando.`;
      return "Que bom te ver de novo.";
    case "/cadastro":
      if (room) return `Cria a conta e a gente já vai para a sala ${room}.`;
      return "É rapidinho: nome, e-mail e uma senha.";
    case "/entrar/2fa":
      return "Só falta o código do seu app autenticador.";
    case "/verificar-email":
      return "Mandei um link para o seu e-mail. Fico de olho daqui.";
    case "/recuperar-senha":
      return "Acontece. Te mando um link para criar outra senha.";
    case "/redefinir-senha":
      return "Escolhe uma senha nova. Eu não olho, prometo.";
    default:
      return "Oi! Eu sou o Nelcota.";
  }
}
