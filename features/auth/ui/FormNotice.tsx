/** Neutral notice at the top of a sign-in form (e.g. after a password reset). */
export function FormNotice({ message }: { message: string | undefined }) {
  if (!message) return null;
  return (
    <output className="block rounded-xl bg-surface-2 px-3 py-2.5 text-sm text-ink-muted">
      {message}
    </output>
  );
}
