import type { Metadata } from "next";
import Link from "next/link";
import { NavBar, NavBrand } from "@/components/NavBar";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = { title: "Aviso de privacidade" };

/**
 * Resumo técnico do tratamento de dados (LGPD). O texto jurídico final é
 * responsabilidade de quem opera o serviço (ver docs/PLANO-ADMIN.md §7.2).
 */
export default function PrivacyPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-4 pt-4 sm:px-6">
        <NavBar aria-label="Principal" className="mx-auto max-w-3xl">
          <NavBrand href="/" />
          <ThemeToggle className="ml-auto" />
        </NavBar>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <article className="glass flex flex-col gap-5 rounded-2xl p-6 leading-relaxed sm:p-8 [&_h2]:mt-2 [&_h2]:text-lg [&_h2]:font-bold [&_p]:text-ink-muted [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-ink-muted">
          <h1 className="text-2xl font-bold tracking-tight">Aviso de privacidade</h1>
          <p>Este resumo explica quais dados o Nelcota guarda, por quê e por quanto tempo.</p>

          <h2>O que guardamos</h2>
          <ul>
            <li>Conta: nome de exibição, e-mail e senha (guardada só como hash argon2id).</li>
            <li>
              Segurança: sessões ativas (IP e navegador) e, se você ativar, o segredo da verificação
              em duas etapas, cifrado.
            </li>
            <li>
              Uso: em quais salas você entrou, quando entrou e saiu, e quando compartilhou a tela,
              com o IP de acesso.
            </li>
          </ul>

          <h2>O que não guardamos</h2>
          <p>
            Não gravamos áudio, vídeo, telas compartilhadas nem mensagens do chat: tudo isso passa
            ao vivo e some quando a sala acaba.
          </p>

          <h2>Por quê</h2>
          <ul>
            <li>Para você usar o serviço (criar e entrar em salas).</li>
            <li>
              Para cumprir a lei: registros de acesso a aplicações são guardados por 6 meses (Marco
              Civil da Internet, art. 15).
            </li>
            <li>
              Para segurança: evitar abuso, bloquear tentativas de invasão e investigar incidentes.
            </li>
          </ul>

          <h2>Por quanto tempo</h2>
          <ul>
            <li>Conta: enquanto ela existir.</li>
            <li>
              Registros de acesso (IP): 6 meses. Nome nas participações: 12 meses, depois
              anonimizado.
            </li>
          </ul>

          <h2>Seus direitos</h2>
          <p>
            Em{" "}
            <Link href="/conta" className="font-semibold text-brand-soft hover:underline">
              Minha conta
            </Link>{" "}
            você baixa todos os seus dados e pode excluir a conta a qualquer momento. Outros pedidos
            sobre seus dados são respondidos em até 15 dias.
          </p>
        </article>
      </main>
    </div>
  );
}
