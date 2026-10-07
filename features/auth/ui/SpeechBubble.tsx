import { useLocation, useSearchParams } from "react-router";

import { mascotLine } from "@/features/auth/domain/access-copy";
import { BubbleText } from "./BubbleText";

/** Mascot bubble: the line changes with the screen and the destination room. */
export function SpeechBubble() {
  const pathname = useLocation().pathname;
  const returnTo = useSearchParams()[0].get("voltar");
  return <BubbleText text={mascotLine(pathname, returnTo)} />;
}
