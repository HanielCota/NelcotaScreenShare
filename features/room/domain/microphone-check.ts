export type MicrophoneCheck = "starting" | "waiting" | "detected" | "confirmed";

/** Confirms sustained audio capture; does not do speech recognition. */
export function createMicrophoneCheck() {
  let state: MicrophoneCheck = "waiting";
  let audibleSince: number | undefined;
  let lastAudible = 0;
  let lastSample: number | undefined;
  return (volume: number, now: number): MicrophoneCheck => {
    if (state === "confirmed") return state;
    const gap = lastSample !== undefined && now - lastSample > 250;
    lastSample = now;
    if (gap) audibleSince = undefined;
    if (Number.isFinite(volume) && volume >= 0.035) {
      audibleSince ??= now;
      lastAudible = now;
      if (now - audibleSince >= 200) state = "detected";
    } else {
      audibleSince = undefined;
      if (state === "detected" && now - lastAudible >= 1500) state = "confirmed";
    }
    return state;
  };
}
