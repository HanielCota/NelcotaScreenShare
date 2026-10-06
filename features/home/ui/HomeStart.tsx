"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { MascotPair } from "@/components/home/MascotPair";
import { SmartBar } from "./SmartBar";

/** Barra "link ou código" com o par de mascotes, que reage enquanto a sala abre. */
export function HomeStart({ invalidCode }: { invalidCode: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Mantém o conteúdo visível enquanto a rota carrega. O pending termina também ao voltar.
  function navigate(href: string) {
    startTransition(() => router.push(href));
  }

  return (
    <SmartBar
      invalidCode={invalidCode}
      pending={pending}
      onNavigate={navigate}
      mascot={<MascotPair pending={pending} />}
    />
  );
}
