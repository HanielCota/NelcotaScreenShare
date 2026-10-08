import { useNavigate } from "react-router";

import { useTransition } from "react";
import { MascotPair } from "@/features/mascot/ui/MascotPair";
import { SmartBar } from "./SmartBar";

/** "Link or code" bar with the pair of mascots, which reacts while the room opens. */
export function HomeStart({ invalidCode }: { invalidCode: boolean }) {
  const navigate = useNavigate();
  const [pending, startTransition] = useTransition();

  // Keeps the content visible while the route loads. Pending also ends when navigating back.
  function openRoom(href: string) {
    startTransition(() => navigate(href, { viewTransition: true }));
  }

  return (
    <SmartBar
      invalidCode={invalidCode}
      pending={pending}
      onNavigate={openRoom}
      mascot={<MascotPair pending={pending} />}
    />
  );
}
