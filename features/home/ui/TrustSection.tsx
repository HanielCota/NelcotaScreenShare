import { ArrowRight, Download, ShieldCheck, VideoOff, type LucideIcon } from "lucide-react";
import { Link } from "react-router";
import { SectionIntro } from "./SectionIntro";

const PROMISES: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: VideoOff,
    title: "Nada fica gravado",
    text: "Áudio, vídeo, telas e chat passam ao vivo e somem quando a sala acaba.",
  },
  {
    icon: ShieldCheck,
    title: "Conta protegida",
    text: "Só quem tem conta entra nas salas, e você pode ligar a verificação em duas etapas.",
  },
  {
    icon: Download,
    title: "Seus dados, suas regras",
    text: "Baixe tudo o que guardamos sobre você ou exclua a conta quando quiser, como manda a LGPD.",
  },
];

/** Privacy as a reason to choose: what is not recorded and what the person controls. */
export function TrustSection() {
  return (
    <section aria-labelledby="trust-title" className="w-full max-w-5xl">
      <SectionIntro
        id="trust-title"
        eyebrow="Privacidade"
        title="Ao vivo, e só ao vivo."
        lead="O que você mostra na sala é assunto seu e de quem está nela."
      />

      <ul className="mt-12 grid gap-4 sm:mt-16 md:grid-cols-3">
        {PROMISES.map(({ icon: Icon, title, text }) => (
          <li
            key={title}
            data-reveal
            className="flex flex-col gap-3 rounded-3xl border border-brand/25 bg-brand/8 p-6"
          >
            <Icon className="size-6 text-brand-soft" aria-hidden="true" />
            <h3 className="text-lg">{title}</h3>
            <p className="text-sm leading-relaxed text-pretty text-ink-muted">{text}</p>
          </li>
        ))}
      </ul>

      <p data-reveal className="mt-8 text-center">
        <Link
          viewTransition
          to="/privacidade"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-soft underline-offset-4 hover:underline"
        >
          Leia o aviso de privacidade
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </p>
    </section>
  );
}
