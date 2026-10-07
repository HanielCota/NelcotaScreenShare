"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { mascotLine } from "@/features/auth/domain/access-copy";
import { BubbleText } from "./BubbleText";

/** Balão do mascote: a fala muda com a tela e com a sala de destino. */
export function SpeechBubble() {
  const pathname = usePathname();
  const returnTo = useSearchParams().get("voltar");
  return <BubbleText text={mascotLine(pathname, returnTo)} />;
}
