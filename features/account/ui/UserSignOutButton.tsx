import { LogOut } from "lucide-react";
import { useNavigate, useRevalidator } from "react-router";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { callAuth } from "@/features/auth/client/auth-call";
import { authClient } from "@/features/auth/client/participant-auth-client";

export function UserSignOutButton() {
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await callAuth(() => authClient.signOut());
    void navigate("/entrar?aviso=saiu", { replace: true, viewTransition: true });
    void revalidator.revalidate();
  }

  return (
    <Button variant="ghost" disabled={pending} onClick={() => void signOut()}>
      <LogOut aria-hidden="true" />
      <span className="max-sm:sr-only">Sair</span>
    </Button>
  );
}
