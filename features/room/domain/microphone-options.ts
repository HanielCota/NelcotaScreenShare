export interface MicrophoneOption {
  /** Valor escolhido: "" segue o padrão do sistema. */
  value: string;
  /**
   * Outros IDs que apontam para este aparelho: o físico, quando o valor é "",
   * e "communications" no aparelho de chamadas. Uma escolha salva com um deles
   * continua marcando o aparelho que de fato está sendo capturado.
   */
  aliases: string[];
  label: string;
  /** Etiquetas curtas: "Padrão", "Chamadas". */
  badges: string[];
  /** Detalhe útil, só quando informa algo ("Bluetooth"). */
  detail?: string;
  kind: "system" | "microphone" | "headset" | "camera";
}

type AudioDevice = Pick<MediaDeviceInfo, "deviceId" | "label">;

const WRAPPER_PREFIX = /^(?:default|padr[aã]o|communications|comunica[cç][oõ]es)\s*-\s*/i;

/** Limpa apenas os invólucros conhecidos; o ID usado na captura não muda. */
export function microphoneLabel(label: string, fallback: string): string {
  const clean = label
    .replace(WRAPPER_PREFIX, "")
    .replace(/\s+\([\da-f]{4}:[\da-f]{4}\)$/i, "")
    .trim();
  const wrapped = /^(?:microphone|microfone|headset)\s+\(([^()]+)\)(?:\s+\(Bluetooth\))?$/i.exec(
    clean,
  );
  return wrapped?.[1] ?? (clean || fallback);
}

function deviceKind(label: string): MicrophoneOption["kind"] {
  if (/webcam|smartcam|camera|câmera|\bcam\b/i.test(label)) return "camera";
  if (/headset|headphone|fone de ouvido|bluetooth/i.test(label)) return "headset";
  return "microphone";
}

/** Entrada "default"/"communications" do Chrome aponta para qual aparelho real. */
function sameDevice(alias: AudioDevice | undefined, device: AudioDevice): boolean {
  return !!alias?.label && alias.label.replace(WRAPPER_PREFIX, "").trim() === device.label.trim();
}

/**
 * Uma opção por aparelho. O padrão do sistema e o de chamadas viram etiquetas
 * no próprio aparelho; escolher o "Padrão" segue o sistema (valor "").
 */
export function microphoneOptions(devices: readonly AudioDevice[]): MicrophoneOption[] {
  const system = devices.find((device) => device.deviceId === "default");
  const calls = devices.find((device) => device.deviceId === "communications");
  const physical = devices.filter(
    (device) => device.deviceId !== "default" && device.deviceId !== "communications",
  );
  const systemDevice = physical.find((device) => sameDevice(system, device));

  const options = physical.map((device, index): MicrophoneOption => {
    const isSystem = device === systemDevice;
    const isCalls = sameDevice(calls, device);
    const badges = [...(isSystem ? ["Padrão"] : []), ...(isCalls ? ["Chamadas"] : [])];
    return {
      value: isSystem ? "" : device.deviceId,
      aliases: [...(isSystem ? [device.deviceId] : []), ...(isCalls ? ["communications"] : [])],
      label: microphoneLabel(device.label, `Microfone ${index + 1}`),
      badges,
      ...(/bluetooth/i.test(device.label) ? { detail: "Bluetooth" } : {}),
      kind: deviceKind(device.label),
    };
  });

  if (systemDevice) {
    // O padrão vai primeiro: é a escolha mais comum.
    const index = physical.indexOf(systemDevice);
    options.unshift(...options.splice(index, 1));
    return options;
  }
  // Sem saber qual aparelho é o padrão (outros navegadores): opção própria.
  return [
    {
      value: "",
      label: system?.label
        ? microphoneLabel(system.label, "Padrão do sistema")
        : "Padrão do sistema",
      aliases: [],
      badges: ["Padrão"],
      kind: "system",
    },
    ...options,
  ];
}
