import { useNavigate } from "react-router";

import { useTransition } from "react";
import { MascotPair } from "@/features/mascot/ui/MascotPair";
import { SmartBar } from "./SmartBar";

/** Barra "link ou código" com o par de mascotes, que reage enquanto a sala abre. */
export function HomeStart({ invalidCode }: { invalidCode: boolean }) {
  const navigate = useNavigate();
  const [pending, startTransition] = useTransition();

  // Mantém o conteúdo visível enquanto a rota carrega. O pending termina também ao voltar.
  function openRoom(href: string) {
    startTransition(() => navigate(href));
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
