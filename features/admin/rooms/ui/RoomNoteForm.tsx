import { useOperation } from "@/lib/use-operation";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateRoomNoteAction } from "@/features/admin/rooms/actions";

/** Nota interna da sala: só o painel vê. */
export function RoomNoteForm({
  id,
  note,
  canEdit,
}: {
  id: string;
  note: string | null;
  canEdit: boolean;
}) {
  const [text, setText] = useState(note ?? "");
  const fieldId = useId();
  const save = useOperation(updateRoomNoteAction, {
    onSuccess: () => toast.success("Nota salva."),
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Não foi possível salvar (até 500 caracteres)."),
  });
  if (!canEdit) {
    return <p className="text-sm whitespace-pre-wrap text-ink-muted">{note || "Sem nota."}</p>;
  }
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        save.execute({ id, note: text });
      }}
    >
      <Label htmlFor={fieldId} className="sr-only">
        Nota interna
      </Label>
      <Textarea
        id={fieldId}
        value={text}
        maxLength={500}
        placeholder="Ex.: sala do treinamento de segunda; pedir gravação ao responsável."
        onChange={(event) => setText(event.target.value)}
      />
      <span className="flex items-center justify-between text-xs text-ink-subtle">
        {text.length}/500
        <Button type="submit" size="sm" disabled={save.isPending || text === (note ?? "")}>
          Salvar nota
        </Button>
      </span>
    </form>
  );
}
