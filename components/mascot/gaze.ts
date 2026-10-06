import { gazeAt, IDLE, type Gaze, type Point } from "./eye-tracking";

export { IDLE, type Gaze } from "./eye-tracking";

/** Vira o rosto enquanto a senha está sendo digitada. */
const LOOK_AWAY: Gaze = {
  x: -0.95,
  y: -0.75,
  leftX: -0.95,
  leftY: -0.75,
  rightX: -0.95,
  rightY: -0.75,
};
/** Campos com texto digitável: sem posição do mouse, o olhar segue o cursor de texto. */
const TEXT_INPUT_TYPES = new Set(["text", "email", "password", "search", "tel", "url"]);

const measure = typeof document === "undefined" ? null : document.createElement("canvas");

/** Olhar do rosto (`face`) na direção de um ponto da tela. */
function lookAt(face: Element, point: Point): Gaze {
  return gazeAt(face.getBoundingClientRect(), point);
}

function center(element: Element): Point {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/** Ponto do texto digitado onde está o cursor (ou o fim do texto). */
function caretPoint(input: HTMLInputElement): Point {
  const rect = input.getBoundingClientRect();
  const style = getComputedStyle(input);
  let width = 0;
  const context = measure?.getContext("2d");
  if (context) {
    context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    let end = input.value.length;
    try {
      end = input.selectionEnd ?? end;
    } catch {
      // type="email" não expõe a seleção: usa o fim do texto.
    }
    width = context.measureText(input.value.slice(0, end)).width;
  }
  const x = Math.min(
    rect.left + parseFloat(style.paddingLeft) + width - input.scrollLeft,
    rect.right - parseFloat(style.paddingRight),
  );
  return { x, y: rect.top + rect.height * 0.62 };
}

/** Campo de senha com foco (escondida ou, com "Mostrar senha", visível). */
export function focusedPasswordField(): HTMLInputElement | undefined {
  const active = document.activeElement;
  if (!(active instanceof HTMLInputElement)) return undefined;
  return active.type === "password" || active.autocomplete.includes("password")
    ? active
    : undefined;
}

/**
 * Um aviso tem prioridade sobre o mouse. Digitação e foco descartam o ponteiro antigo no hook.
 * Senhas sempre desviam o olhar, inclusive quando o ponteiro está sobre o campo.
 */
export function gazeFor(
  face: Element,
  attention: Element | undefined,
  pointer: Point | null,
): Gaze {
  if (focusedPasswordField()) return LOOK_AWAY;
  if (attention?.isConnected) return lookAt(face, center(attention));
  if (pointer) return lookAt(face, pointer);
  const active = document.activeElement;
  if (active instanceof HTMLInputElement && TEXT_INPUT_TYPES.has(active.type)) {
    return active.type === "password" ? LOOK_AWAY : lookAt(face, caretPoint(active));
  }
  // Texto livre (várias linhas): olha pro campo, como quem acompanha o que está sendo escrito.
  if (active instanceof HTMLTextAreaElement) return lookAt(face, center(active));
  if (
    active instanceof HTMLInputElement ||
    active instanceof HTMLButtonElement ||
    active instanceof HTMLAnchorElement
  ) {
    return lookAt(face, center(active));
  }
  return IDLE;
}
