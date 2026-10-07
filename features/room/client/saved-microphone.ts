const MIC_KEY = "nelcota:microfone";

/** Microphone chosen last time in this browser (convenience; may not exist). */
export function savedMicrophone(): string | undefined {
  try {
    return localStorage.getItem(MIC_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export function saveMicrophone(deviceId: string | undefined) {
  try {
    if (deviceId) {
      localStorage.setItem(MIC_KEY, deviceId);
      return;
    }
    localStorage.removeItem(MIC_KEY);
  } catch {
    // Storage blocked: it just does not remember the choice.
  }
}
