const MIC_KEY = "nelcota:microfone";

/** Microfone escolhido da última vez neste navegador (conveniência; pode não existir). */
export function savedMicrophone(): string | undefined {
  try {
    return localStorage.getItem(MIC_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export function saveMicrophone(deviceId: string | undefined) {
  try {
    if (deviceId) localStorage.setItem(MIC_KEY, deviceId);
    else localStorage.removeItem(MIC_KEY);
  } catch {
    // Armazenamento bloqueado: só não lembra a escolha.
  }
}
