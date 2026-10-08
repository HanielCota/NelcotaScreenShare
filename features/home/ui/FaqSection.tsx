import { ArrowRight, Plus } from "lucide-react";
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
      question: "Quem eu convido precisa criar conta?",
      answer:
        "Não. Quem recebe o link entra só com o nome, como convidado, e aparece na sala marcado assim. A conta grátis é só para quem abre a sala.",
    },
    {
      question: "Quanto custa?",
      answer:
        "O plano Grátis não tem prazo nem cartão. O Pro, para times que usam todo dia, vai custar R$ 19 por pessoa por mês; deixe seu e-mail na seção de preços para saber quando abrir.",
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

/**
 * Last objections: the title and the way to the privacy notice stay on the left while the
 * questions, native disclosure widgets on hairlines, run on the right.
 */
export function FaqSection({ maxParticipants }: { maxParticipants: number }) {
  return (
    <section
      aria-labelledby="faq-title"
      className="grid w-full max-w-5xl gap-12 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-16"
    >
      <div className="flex flex-col gap-6 md:sticky md:top-28 md:self-start">
        <SectionIntro id="faq-title" title="Perguntas" subtitle="frequentes." />
        <p className="max-w-xs text-base text-pretty text-ink-muted">
          O que as pessoas perguntam antes de abrir a primeira sala.
        </p>
        <Link
          viewTransition
          to="/privacidade"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-brand-soft underline-offset-4 hover:underline"
        >
          Leia o aviso de privacidade
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      <div data-fx className="flex flex-col divide-y divide-line border-y border-line">
        {faqItems(maxParticipants).map(({ question, answer }) => (
          <details key={question} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-lg font-medium tracking-[-0.01em] transition-colors hover:text-brand-soft [&::-webkit-details-marker]:hidden">
              {question}
              <Plus
                className="size-5 shrink-0 text-ink-subtle transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </summary>
            <p className="max-w-xl pb-6 text-base leading-relaxed text-pretty text-ink-muted">
              {answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
