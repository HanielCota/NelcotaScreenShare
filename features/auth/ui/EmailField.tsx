import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { nodMascot, setMascotDoubt } from "@/features/mascot/client/events";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { suggestEmail } from "@/features/auth/domain/email-suggest";
import { EMAIL_PATTERN } from "@/features/auth/domain/sign-up";

/** E-mail digitado numa aba vale na outra (só nesta aba do navegador). */
const REMEMBER_KEY = "nelcota:acesso-email";

function remember(value: string) {
  try {
    sessionStorage.setItem(REMEMBER_KEY, value);
  } catch {
    // Sem sessionStorage: segue sem lembrar.
  }
}

export function forgetTypedEmail() {
  try {
    sessionStorage.removeItem(REMEMBER_KEY);
  } catch {
    // Armazenamento bloqueado: nada a esquecer.
  }
}

/**
 * Campo de e-mail das telas de acesso: lembra o que foi digitado ao trocar
 * de aba, sugere o domínio certo ("gmial.com" → "gmail.com") e avisa o
 * mascote (desconfiado com o erro, aprovando quando fica certo).
 */
export function EmailField({
  id,
  autoComplete,
  invalid,
  describedBy,
}: {
  id: string;
  autoComplete: "username" | "email";
  invalid?: boolean;
  describedBy?: string | undefined;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const [suggestion, setSuggestion] = useState<string>();

  // Antes da pintura: o campo já aparece preenchido, sem piscar vazio.
  useLayoutEffect(() => {
    const input = ref.current;
    if (!input || input.value) return;
    try {
      const saved = sessionStorage.getItem(REMEMBER_KEY);
      if (saved) input.value = saved;
    } catch {
      // Sem sessionStorage (modo privado restrito): só não lembra.
    }
  }, []);

  useEffect(() => () => setMascotDoubt(false), []);

  function check(value: string) {
    const next = suggestEmail(value);
    setSuggestion(next);
    setMascotDoubt(next !== undefined);
    if (!next && EMAIL_PATTERN.test(value)) nodMascot();
  }

  function accept() {
    if (!ref.current || !suggestion) return;
    ref.current.value = suggestion;
    remember(suggestion);
    setSuggestion(undefined);
    setMascotDoubt(false);
    nodMascot();
    ref.current.focus();
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>E-mail</Label>
      <Input
        ref={ref}
        id={id}
        name="email"
        type="email"
        inputMode="email"
        autoComplete={autoComplete}
        spellCheck={false}
        required
        className="h-11"
        aria-invalid={invalid || undefined}
        aria-describedby={
          [describedBy, suggestion ? hintId : undefined].filter(Boolean).join(" ") || undefined
        }
        onChange={(event) => {
          remember(event.target.value);
          if (suggestion) {
            setSuggestion(undefined);
            setMascotDoubt(false);
          }
        }}
        onBlur={(event) => check(event.target.value.trim())}
      />
      {suggestion ? (
        <p id={hintId} className="text-sm text-ink-muted">
          Você quis dizer{" "}
          <button
            type="button"
            onClick={accept}
            className="font-medium text-brand-soft underline-offset-2 hover:underline"
          >
            {suggestion}
          </button>
          ?
        </p>
      ) : null}
    </div>
  );
}
