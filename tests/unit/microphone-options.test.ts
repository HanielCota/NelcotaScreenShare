import { expect, test } from "vitest";
import { microphoneLabel, microphoneOptions } from "@/features/room/domain/microphone-options";

test("cada aparelho aparece uma vez, com o padrão e o de chamadas como etiquetas", () => {
  const options = microphoneOptions([
    { deviceId: "default", label: "Padrão - Microphone (fifine Microphone) (3142:a010)" },
    { deviceId: "communications", label: "Comunicações - Headset (Space Travel 2) (Bluetooth)" },
    { deviceId: "cam-id", label: "Microphone (EMEET SmartCam S600)" },
    { deviceId: "fifine-id", label: "Microphone (fifine Microphone) (3142:a010)" },
    { deviceId: "headset-id", label: "Headset (Space Travel 2) (Bluetooth)" },
  ]);
  expect(options.map((option) => option.value)).toEqual(["", "cam-id", "headset-id"]);
  expect(options[0]).toMatchObject({
    aliases: ["fifine-id"],
    label: "fifine Microphone",
    badges: ["Padrão"],
    kind: "microphone",
  });
  expect(options[1]).toMatchObject({ label: "EMEET SmartCam S600", badges: [], kind: "camera" });
  expect(options[2]).toMatchObject({
    label: "Space Travel 2",
    aliases: ["communications"],
    badges: ["Chamadas"],
    detail: "Bluetooth",
    kind: "headset",
  });
});

test("sem saber qual aparelho é o padrão, ele ganha uma opção própria", () => {
  expect(microphoneLabel("Studio (USB-C) - canal 2", "Microfone")).toBe("Studio (USB-C) - canal 2");
  expect(microphoneOptions([{ deviceId: "unnamed", label: "" }])[1]?.label).toBe("Microfone 1");
  expect(microphoneOptions([])).toEqual([
    { value: "", aliases: [], label: "Padrão do sistema", badges: ["Padrão"], kind: "system" },
  ]);
});
