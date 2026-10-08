import { Loader2, Plus } from "lucide-react";
import { useTransition } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { newRoomHref } from "@/features/home/domain/new-room";

/**
 * "Criar sala grátis" outside the hero bar. The room code is drawn on click (never during
 * render, so server and browser agree), and visitors go through sign-up first.
 */
export function CreateRoomButton({
  signedIn,
  variant = "default",
  className,
}: {
  signedIn: boolean;
  variant?: "default" | "secondary";
  className?: string;
}) {
  const navigate = useNavigate();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="lg"
      variant={variant}
      disabled={pending}
      className={className}
      onClick={() =>
        startTransition(() => navigate(newRoomHref(signedIn), { viewTransition: true }))
      }
    >
      {pending ? (
        <Loader2 className="animate-spin" aria-hidden="true" />
      ) : (
        <Plus aria-hidden="true" />
      )}
      {pending ? "Abrindo…" : "Criar sala grátis"}
    </Button>
  );
}
