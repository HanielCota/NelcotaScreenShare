import { ArrowRight, ChevronDown } from "lucide-react";
import { Link } from "react-router";
import { SectionIntro } from "./SectionIntro";

function faqItems(maxParticipants: number): { question: string; answer: string }[] {
  return [
    {
      question: "Preciso instalar alguma coisa?",
      answer:
        "Não. A sala abre no navegador, tanto no computador quanto no celular. Nada de programa ou extensão.",
    },
    {
      question: "Preciso ter conta? E quem eu convido?",
      answer:
        "Sim, cada pessoa entra com a própria conta: assim todo mundo sabe quem está na sala. Quem ainda não tem cria em poucos segundos e volta direto para a sala do link.",
    },
    {
      question: "O som do computador vai junto com a tela?",
      answer:
        "No Chrome e no Edge, sim: é só compartilhar com som. No Firefox e no Safari, a tela vai sem o som do computador.",
    },
    {
      question: "Funciona no celular?",
      answer:
        "Funciona para assistir, falar e usar o chat. Para compartilhar a sua tela, entre pelo computador.",
    },
    {
      question: "Quantas pessoas cabem numa sala?",
      answer: `Até ${maxParticipants}. O Nelcota é feito para conversas pequenas, em que todo mundo participa.`,
    },
    {
      question: "As chamadas ficam gravadas?",
      answer: "Não. Áudio, vídeo, telas e mensagens do chat passam ao vivo e não são guardados.",
    },
    {
      question: "O que vocês guardam sobre mim?",
      answer:
        "Só o necessário para a conta e para o histórico de acesso às salas. Na página da conta você baixa tudo isso ou exclui a conta quando quiser, como manda a LGPD.",
    },
  ];
}

/** Last objections, as native disclosure widgets, with the full privacy notice one click away. */
export function FaqSection({ maxParticipants }: { maxParticipants: number }) {
  return (
    <section aria-labelledby="faq-title" className="w-full max-w-3xl">
      <SectionIntro id="faq-title" title="Perguntas frequentes" />

      <div className="mt-10 flex flex-col gap-3">
        {faqItems(maxParticipants).map(({ question, answer }) => (
          <details
            key={question}
            data-reveal
            className="group rounded-2xl border border-line bg-surface/60 transition-colors open:border-brand/30"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-medium [&::-webkit-details-marker]:hidden">
              {question}
              <ChevronDown
                className="size-5 shrink-0 text-ink-subtle transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </summary>
            <p className="px-5 pb-5 text-sm leading-relaxed text-pretty text-ink-muted">{answer}</p>
          </details>
        ))}
      </div>

      <p className="mt-6 text-center">
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
