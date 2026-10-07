import { useLocation, useSearchParams } from "react-router";

import { mascotLine } from "@/features/auth/domain/access-copy";
import { BubbleText } from "./BubbleText";

/** Balão do mascote: a fala muda com a tela e com a sala de destino. */
export function SpeechBubble() {
  const pathname = useLocation().pathname;
  const returnTo = useSearchParams()[0].get("voltar");
  return <BubbleText text={mascotLine(pathname, returnTo)} />;
}
