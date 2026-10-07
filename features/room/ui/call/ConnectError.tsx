"use client";

import { AlertTriangle, Loader2, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusScreen } from "@/features/room/ui/StatusScreen";

/** A conexão nem abriu: explica o motivo e oferece tentar de novo (com token novo). */
export function ConnectError({
  message,
  onRetry,
  onBack,
}: {
  message: string;
  onRetry: () => Promise<void>;
  onBack: () => void;
}) {
  const [retrying, setRetrying] = useState(false);
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <StatusScreen
        icon={AlertTriangle}
        tone="danger"
        title="Não deu para conectar"
        message={message}
        alert
      >
        <Button
          size="lg"
          disabled={retrying}
          onClick={() => {
            setRetrying(true);
            void onRetry().finally(() => setRetrying(false));
          }}
        >
          {retrying ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <RotateCcw aria-hidden="true" />
          )}
          Tentar de novo
        </Button>
        <Button variant="outline" size="lg" onClick={onBack}>
          Voltar
        </Button>
      </StatusScreen>
    </main>
  );
}
