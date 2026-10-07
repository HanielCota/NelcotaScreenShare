interface ScreenShareLike {
  publication: { trackSid: string };
  participant: { isLocal: boolean };
}

/**
 * Screen that goes on stage: the chosen one, otherwise the most recent from others. Your
 * own screen only goes up when it is the only one (the stage shows a small preview,
 * without the mirror effect).
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
