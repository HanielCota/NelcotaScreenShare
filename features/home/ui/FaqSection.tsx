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

/** Last objections, as native disclosure widgets, with the full privacy notice one click away. */
export function FaqSection({ maxParticipants }: { maxParticipants: number }) {
  return (
    <section aria-labelledby="faq-title" className="w-full max-w-5xl">
      <SectionIntro id="faq-title" title="Perguntas" subtitle="frequentes." />

      <div className="mt-12 flex max-w-3xl flex-col gap-3 sm:mt-16">
        {faqItems(maxParticipants).map(({ question, answer }) => (
          <details
            key={question}
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

      <p className="mt-6">
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
