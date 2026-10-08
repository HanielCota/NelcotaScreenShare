import { useTransition } from "react";
import { useNavigate } from "react-router";
import { MascotPair } from "@/features/mascot/ui/MascotPair";
import { newRoomHref } from "@/features/home/domain/new-room";
import { SmartBar } from "./SmartBar";

/** "Link or code" bar with the pair of mascots, which reacts while the room opens. */
export function HomeStart({ invalidCode, signedIn }: { invalidCode: boolean; signedIn: boolean }) {
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
      createRoomHref={() => newRoomHref(signedIn)}
      mascot={<MascotPair pending={pending} />}
    />
  );
}
