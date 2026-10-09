interface ScreenShareLike {
  publication: { trackSid: string };
  participant: { isLocal: boolean };
}

/**
 * Screen that goes on stage: the chosen one, otherwise the most recent from others
 * (`shares` sorted by appearance, see `sortByOrder`). Your
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

/**
 * Order in which the screens appeared: known ones keep their place, new ones go
 * to the end. `takesStage` is true when someone else started a new screen, which
 * replaces any screen chosen by hand (whoever just started wants to be seen).
 */
export function trackShareOrder(
  previous: readonly string[],
  shares: readonly ScreenShareLike[],
): { order: string[]; takesStage: boolean } {
  const present = new Set(shares.map((share) => share.publication.trackSid));
  const known = new Set(previous);
  const added = shares.filter((share) => !known.has(share.publication.trackSid));
  return {
    order: [
      ...previous.filter((sid) => present.has(sid)),
      ...added.map((share) => share.publication.trackSid),
    ],
    takesStage: added.some((share) => !share.participant.isLocal),
  };
}

/** The screens in the order they appeared (unknown ones last). */
export function sortByOrder<T extends ScreenShareLike>(
  shares: readonly T[],
  order: readonly string[],
): T[] {
  const position = (share: T) => {
    const index = order.indexOf(share.publication.trackSid);
    return index === -1 ? order.length : index;
  };
  return shares.toSorted((first, second) => position(first) - position(second));
}
