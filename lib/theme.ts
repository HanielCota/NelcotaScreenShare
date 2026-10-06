export type Theme = "dark" | "light";

const STORAGE_KEY = "nelcota:tema";

/** Cor da barra do navegador (celular) em cada tema: igual ao `--color-canvas`. */
export const THEME_COLOR: Record<Theme, string> = { dark: "#17181a", light: "#e6e4df" };

/**
 * Roda no <head> antes da primeira pintura: aplica o tema salvo ou, sem escolha
 * salva, o do sistema. Evita a página piscar no tema errado.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(STORAGE_KEY)})}catch(e){}if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.documentElement.dataset.theme=t;var m=document.querySelector('meta[name="theme-color"]');if(m)m.content=t==="light"?${JSON.stringify(THEME_COLOR.light)}:${JSON.stringify(THEME_COLOR.dark)}})()`;

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme]);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Armazenamento bloqueado: o tema vale só até recarregar.
  }
}

/** Avisa quem depende do tema (botão, toasts) quando o atributo muda. */
export function subscribeTheme(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
