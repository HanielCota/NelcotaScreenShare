export type MicrophoneCheck = "starting" | "waiting" | "detected" | "confirmed";

/** Volume (on the meter's 0–1 scale) that counts as sound rather than background noise. */
const AUDIBLE_VOLUME = 0.035;
/** Sound held this long is a voice, not a click or a bump. */
const DETECT_AFTER_MS = 200;
/** Quiet this long after the voice: the person finished a phrase, so the check is confirmed. */
const CONFIRM_AFTER_MS = 1500;
/** Samples further apart than this (tab in the background) restart the count. */
const MAX_SAMPLE_GAP_MS = 250;

/** Confirms sustained audio capture; does not do speech recognition. */
export function createMicrophoneCheck() {
  let state: MicrophoneCheck = "waiting";
  let audibleSince: number | undefined;
  let lastAudible = 0;
  let lastSample: number | undefined;
  return (volume: number, now: number): MicrophoneCheck => {
    if (state === "confirmed") return state;
    const gap = lastSample !== undefined && now - lastSample > MAX_SAMPLE_GAP_MS;
    lastSample = now;
    if (gap) audibleSince = undefined;
    if (Number.isFinite(volume) && volume >= AUDIBLE_VOLUME) {
      audibleSince ??= now;
      lastAudible = now;
      if (now - audibleSince >= DETECT_AFTER_MS) state = "detected";
      return state;
    }
    audibleSince = undefined;
    if (state === "detected" && now - lastAudible >= CONFIRM_AFTER_MS) state = "confirmed";
    return state;
  };
}
