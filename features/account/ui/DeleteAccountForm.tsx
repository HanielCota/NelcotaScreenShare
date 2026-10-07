import { Loader2 } from "lucide-react";

import { useOperation } from "@/lib/operations/use-operation";
import { useId, useState } from "react";
import { deleteMyAccount } from "@/features/account/actions";
import { FormError } from "@/components/FormError";
import { PasswordInput } from "@/components/PasswordInput";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formText } from "@/lib/utils";
import { useCloseRow } from "./settings/ExpandableRow";

/** Account deletion confirmation (LGPD): asks for the current password. */
export function DeleteAccountForm() {
  const passwordId = useId();
  const errorId = useId();
  const closeRow = useCloseRow();
  const [passwordError, setPasswordError] = useState<string>();
  const remove = useOperation(deleteMyAccount);
  const error = passwordError ?? remove.result.serverError;

  return (
    <form
      method="post"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const password = formText(new FormData(event.currentTarget), "password");
        if (!password) {
          setPasswordError("Informe sua senha para confirmar.");
          event.currentTarget.querySelector<HTMLInputElement>("input[name=password]")?.focus();
          return;
        }
        setPasswordError(undefined);
        remove.execute({ password });
      }}
      className="flex max-w-sm flex-col gap-3"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor={passwordId}>Digite sua senha para confirmar</Label>
        <PasswordInput
          id={passwordId}
          name="password"
          autoComplete="current-password"
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={() => setPasswordError(undefined)}
        />
      </div>
      <FormError id={errorId} message={error} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="destructive" disabled={remove.isPending}>
          {remove.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          Excluir minha conta para sempre
        </Button>
        {closeRow ? (
          <Button
            type="button"
            variant="ghost"
            onClick={(event) => {
              event.currentTarget.form?.reset();
              setPasswordError(undefined);
              closeRow();
            }}
          >
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  );
}
