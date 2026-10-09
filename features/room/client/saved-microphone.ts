const MIC_KEY = "nelcota:microfone";
const MAX_DEVICE_ID_LENGTH = 256;

/** Microphone chosen last time in this browser (convenience; may not exist). */
export function savedMicrophone(): string | undefined {
  try {
    const saved = localStorage.getItem(MIC_KEY);
    // Browser device ids are short opaque strings; anything else was not written here.
    if (!saved || saved.length > MAX_DEVICE_ID_LENGTH) return undefined;
    return saved;
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
