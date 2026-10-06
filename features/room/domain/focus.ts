interface ScreenShareLike {
  publication: { trackSid: string };
  participant: { isLocal: boolean };
}

/**
 * Tela que vai para o palco: a escolhida, senão a mais recente dos outros. A
 * própria tela só entra quando é a única (o palco mostra uma prévia pequena,
 * sem o efeito espelho).
 */
export function pickFocusedShare<T extends ScreenShareLike>(
  shares: readonly T[],
  focusedSid: string | undefined,
): T | undefined {
  return (
    shares.find((share) => share.publication.trackSid === focusedSid) ??
    shares.findLast((share) => !share.participant.isLocal) ??
    shares.at(-1)
  );
}
