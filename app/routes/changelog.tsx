import { Link, type MetaFunction } from "react-router";
import { ParticipantHeader } from "@/components/shell/ParticipantHeader";
import { RELEASES } from "@/features/home/domain/changelog";
import { ReleaseNotes } from "@/features/home/ui/ReleaseNotes";
import { INDEXABLE, originFromMatches, pageMeta } from "@/lib/seo";

export const handle = INDEXABLE;

export const meta: MetaFunction = ({ matches }) =>
  pageMeta({
    title: "Novidades · Nelcota",
    description: "O que mudou no Nelcota: recursos novos, correções e melhorias.",
    path: "/novidades",
    origin: originFromMatches(matches),
  });

export default function ChangelogPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <ParticipantHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-16">
        <h1 className="text-3xl font-medium tracking-tight text-balance sm:text-4xl">Novidades</h1>
        <p className="mt-3 text-base leading-relaxed text-pretty text-ink-muted sm:text-lg">
          Recursos novos, correções e melhorias, das mais recentes para as mais antigas.
        </p>
        <div className="mt-10 flex flex-col gap-14">
          {RELEASES.map((release) => (
            <ReleaseNotes key={release.date} release={release} headingLevel="h2" />
          ))}
        </div>
      </main>
      <footer className="mx-auto w-[min(100%-2rem,48rem)] border-t border-line py-6 text-center text-xs text-ink-subtle">
        Nelcota
        <Link viewTransition to="/" className="ml-3 underline-offset-4 hover:underline">
          Início
        </Link>
      </footer>
    </div>
  );
}
