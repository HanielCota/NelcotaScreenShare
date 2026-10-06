/** Mensagem de erro do formulário, anunciada por leitores de tela. */
export function FormError({ id, message }: { id?: string; message?: string | undefined }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="rounded-xl bg-danger/15 px-3 py-2.5 text-sm text-danger">
      {message}
    </p>
  );
}
