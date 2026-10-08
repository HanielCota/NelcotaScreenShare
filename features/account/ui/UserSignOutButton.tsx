import { LogOut } from "lucide-react";
import { useNavigate, useRevalidator } from "react-router";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/features/auth/client/participant-auth-client";

export function UserSignOutButton() {
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="ghost"
      className="h-9 rounded-xl px-3"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void authClient.signOut().finally(() => {
          void navigate("/entrar?aviso=saiu", { replace: true, viewTransition: true });
          void revalidator.revalidate();
        });
      }}
    >
      <LogOut aria-hidden="true" />
      <span className="max-sm:sr-only">Sair</span>
    </Button>
  );
}
