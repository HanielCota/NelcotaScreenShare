/**
 * Why the person is on the leave screen. Each reason has its own title and
 * actions: whoever left on purpose can go back to the room; whoever was removed cannot.
 */
export type LeaveReason =
  /** Clicked Sair. */
  | "self"
  /** The room was ended (or deleted in the dashboard). */
  | "ended"
  /** Someone removed the person from the room. */
  | "removed"
  /** Joined the same room in another tab or device. */
  | "elsewhere"
  /** The connection dropped mid-call. */
  | "dropped"
  /** Never got in (token denied, connection did not open). */
  | "failed";

export interface LeaveNotice {
  reason: LeaveReason;
  message?: string;
}

/** Time in the call, or `undefined` if the join time is unknown. */
export function callDuration(startedAt: number | undefined, now: number): number | undefined {
  if (startedAt === undefined || !Number.isFinite(startedAt)) return undefined;
  return Math.max(0, now - startedAt);
}

/** "menos de 1 min", "42 min", "1 h 05 min". */
export function formatCallDuration(ms: number): string {
  const minutes = Math.floor(Math.max(0, ms) / 60_000);
  if (minutes < 1) return "menos de 1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${String(minutes % 60).padStart(2, "0")} min`;
}
