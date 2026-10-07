/** With no activity for this long, the mascot gets sleepy (the home page pair stops walking). */
export const SLEEPY_AFTER_MS = 30_000;
const ASLEEP_AFTER_MS = 45_000;

/** Re-evaluates the last activity, even if a timer fires late. */
export function idleSleep(lastActivity: number, now: number) {
  const elapsed = Math.max(0, now - lastActivity);
  if (elapsed < SLEEPY_AFTER_MS)
    return { expression: null, nextIn: SLEEPY_AFTER_MS - elapsed } as const;
  if (elapsed < ASLEEP_AFTER_MS)
    return { expression: "sleepy", nextIn: ASLEEP_AFTER_MS - elapsed } as const;
  return { expression: "asleep", nextIn: Infinity } as const;
}
