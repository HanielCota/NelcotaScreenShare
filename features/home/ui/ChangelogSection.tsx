import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { RELEASES } from "@/features/home/domain/changelog";
import { ReleaseNotes } from "./ReleaseNotes";
import { SectionIntro } from "./SectionIntro";

const PREVIEW_CHANGES = 5;

/** The latest release, so visitors see the app keeps moving; the full history is one click away. */
export function ChangelogSection() {
  const [latest] = RELEASES;
  if (!latest) return null;
  const hidden = latest.changes.length - PREVIEW_CHANGES;

  return (
    <section
      id="novidades"
      aria-labelledby="changelog-title"
      className="w-full max-w-5xl scroll-mt-28"
    >
      <SectionIntro id="changelog-title" title="Novidades." subtitle="O que mudou por aqui." />

      <div className="mt-12 max-w-3xl sm:mt-16">
        <ReleaseNotes release={latest} limit={PREVIEW_CHANGES} />
      </div>

      <p className="mt-6">
        <Link
          viewTransition
          to="/novidades"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-soft underline-offset-4 hover:underline"
        >
          {hidden > 0 ? `Ver mais ${hidden} mudanças e o histórico` : "Ver o histórico"}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </p>
    </section>
  );
}
