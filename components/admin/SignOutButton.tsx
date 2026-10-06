"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { adminAuthClient } from "@/lib/admin-auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="ghost"
      className="h-9 rounded-xl px-3"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void adminAuthClient.signOut().finally(() => {
          router.replace("/admin/entrar?aviso=saiu");
          router.refresh();
        });
      }}
    >
      <LogOut aria-hidden="true" />
      <span className="max-sm:sr-only">Sair</span>
    </Button>
  );
}
