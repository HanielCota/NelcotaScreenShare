import { Link } from "react-router";
import {
  ArrowRight,
  Clock,
  Download,
  Fingerprint,
  Hourglass,
  KeyRound,
  Landmark,
  MessageSquareOff,
  MicOff,
  MonitorOff,
  ShieldCheck,
  Trash2,
  UserRound,
  UserRoundCheck,
  VideoOff,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ParticipantHeader } from "@/components/shell/ParticipantHeader";
import { PrivacyItem, PrivacyList, PrivacySection } from "@/features/privacy/ui/PrivacySection";
import { PrivacyToc } from "@/features/privacy/ui/PrivacyToc";

export const meta = () => [
  { title: "Aviso de privacidade · Nelcota" },
  {
    name: "description",
    content: "Quais dados o Nelcota guarda, por quê e por quanto tempo.",
  },
];

const SECTIONS = [
  { id: "o-que-guardamos", label: "O que guardamos" },
  { id: "o-que-nao-guardamos", label: "O que não guardamos" },
  { id: "por-que", label: "Por quê" },
  { id: "por-quanto-tempo", label: "Prazos" },
  { id: "seus-direitos", label: "Direitos" },
];

const HIGHLIGHTS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: VideoOff,
    title: "Nada da chamada é gravado",
    text: "Áudio, vídeo, tela e chat passam ao vivo e somem quando a sala acaba.",
  },
  {
    icon: ShieldCheck,
    title: "Só o necessário",
    text: "Conta, segurança e registros de acesso exigidos por lei.",
  },
  {
    icon: UserRoundCheck,
    title: "Você no controle",
    text: "Baixe seus dados ou exclua a conta quando quiser.",
  },
];

const NOT_STORED: { icon: LucideIcon; label: string }[] = [
  { icon: MicOff, label: "Áudio" },
  { icon: VideoOff, label: "Vídeo" },
  { icon: MonitorOff, label: "Telas compartilhadas" },
  { icon: MessageSquareOff, label: "Mensagens do chat" },
];

function Duration({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/12 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-brand-soft">
      <Clock className="size-3.5" aria-hidden="true" />
      {children}
    </span>
  );
}

/**
 * Technical summary of data processing (LGPD). The final legal text is the
 * responsibility of whoever operates the service (see docs/archive/admin-plan.md §7.2).
 */
export default function PrivacyPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <ParticipantHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-16">
        <header className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-medium text-ink-muted">
            <ShieldCheck className="size-4.5 text-brand-soft" aria-hidden="true" />
            LGPD · Marco Civil da Internet
          </span>
          <h1 className="mt-5 text-3xl font-medium tracking-tight text-balance sm:text-4xl">
            Aviso de privacidade
          </h1>
          <p className="mt-3 text-base leading-relaxed text-pretty text-ink-muted sm:text-lg">
            Este resumo explica quais dados o Nelcota guarda, por quê e por quanto tempo.
          </p>
        </header>

        <ul aria-label="Resumo" className="mt-8 grid gap-3 sm:grid-cols-3">
          {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="rounded-2xl border border-line bg-surface p-5">
              <span className="grid size-10 place-items-center rounded-xl bg-brand/12 text-brand-soft">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <p className="mt-4 text-sm font-medium">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">{text}</p>
            </li>
          ))}
        </ul>

        <div className="sticky top-3 z-10 mt-10">
          <PrivacyToc items={SECTIONS} />
        </div>

        <div className="mt-10">
          <div className="flex flex-col gap-14">
            <PrivacySection
              id="o-que-guardamos"
              index={1}
              title="O que guardamos"
              description="Os dados ligados à sua conta, divididos pelo motivo de existirem."
            >
              <PrivacyList>
                <PrivacyItem icon={UserRound} title="Conta">
                  Nome de exibição, e-mail, senha (guardada só como hash argon2id) e, se você
                  escolher, a foto de perfil, sem os metadados da imagem. Nome e foto aparecem para
                  quem está nas mesmas salas; a foto pode ser trocada ou removida em Minha conta.
                </PrivacyItem>
                <PrivacyItem icon={KeyRound} title="Segurança">
                  Sessões ativas (IP e navegador) e, se você ativar, o segredo da verificação em
                  duas etapas, cifrado.
                </PrivacyItem>
                <PrivacyItem icon={Fingerprint} title="Uso">
                  Em quais salas você entrou, quando entrou e saiu, e quando compartilhou a tela,
                  com o IP de acesso.
                </PrivacyItem>
              </PrivacyList>
            </PrivacySection>

            <PrivacySection
              id="o-que-nao-guardamos"
              index={2}
              title="O que não guardamos"
              description="Não gravamos áudio, vídeo, telas compartilhadas nem mensagens do chat: tudo isso passa ao vivo e some quando a sala acaba."
            >
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {NOT_STORED.map(({ icon: Icon, label }) => (
                  <li
                    key={label}
                    className="flex flex-col items-start gap-3 rounded-2xl border border-brand/25 bg-brand/8 p-4"
                  >
                    <Icon className="size-5 text-brand-soft" aria-hidden="true" />
                    <span className="text-sm font-medium">{label}</span>
                  </li>
                ))}
              </ul>
            </PrivacySection>

            <PrivacySection id="por-que" index={3} title="Por quê">
              <PrivacyList>
                <PrivacyItem icon={Wrench} title="Para você usar o serviço">
                  Criar e entrar em salas.
                </PrivacyItem>
                <PrivacyItem icon={Landmark} title="Para cumprir a lei">
                  Registros de acesso a aplicações são guardados por 6 meses (Marco Civil da
                  Internet, art. 15).
                </PrivacyItem>
                <PrivacyItem icon={ShieldCheck} title="Para segurança">
                  Evitar abuso, bloquear tentativas de invasão e investigar incidentes.
                </PrivacyItem>
              </PrivacyList>
            </PrivacySection>

            <PrivacySection id="por-quanto-tempo" index={4} title="Por quanto tempo">
              <PrivacyList>
                <PrivacyItem
                  icon={UserRound}
                  title="Conta"
                  aside={<Duration>Enquanto existir</Duration>}
                />
                <PrivacyItem
                  icon={Fingerprint}
                  title="Registros de acesso (IP)"
                  aside={<Duration>6 meses</Duration>}
                />
                <PrivacyItem
                  icon={Hourglass}
                  title="Nome nas participações"
                  aside={<Duration>12 meses</Duration>}
                >
                  Depois disso, anonimizado.
                </PrivacyItem>
              </PrivacyList>
            </PrivacySection>

            <PrivacySection
              id="seus-direitos"
              index={5}
              title="Seus direitos"
              description="Em Minha conta você baixa todos os seus dados e pode excluir a conta a qualquer momento."
            >
              <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Link
                    to="/conta#privacidade"
                    className="group flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-4 transition-colors hover:bg-surface-3 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <Download className="size-5 shrink-0 text-brand-soft" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">Baixar meus dados</span>
                      <span className="block text-xs text-ink-muted">Arquivo JSON completo</span>
                    </span>
                    <ArrowRight
                      className="size-4 text-ink-subtle transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                  <Link
                    to="/conta#excluir"
                    className="group flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-4 transition-colors hover:bg-surface-3 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <Trash2 className="size-5 shrink-0 text-danger" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">Excluir conta</span>
                      <span className="block text-xs text-ink-muted">Não pode ser desfeito</span>
                    </span>
                    <ArrowRight
                      className="size-4 text-ink-subtle transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-ink-muted">
                  Outros pedidos sobre seus dados são respondidos em até 15 dias.
                </p>
                <Button asChild variant="outline" className="mt-4">
                  <Link to="/conta">Abrir Minha conta</Link>
                </Button>
              </div>
            </PrivacySection>
          </div>
        </div>
      </main>
      <footer className="mx-auto w-[min(100%-2rem,48rem)] border-t border-line py-6 text-center text-xs text-ink-subtle">
        Nelcota
        <Link to="/" className="ml-3 underline-offset-4 hover:underline">
          Início
        </Link>
      </footer>
    </div>
  );
}
