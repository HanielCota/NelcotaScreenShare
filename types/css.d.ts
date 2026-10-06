/** Nome de variável CSS, ex.: `--mascot-saturation`. */
export type CssVariable = `--${string}`;

/** Variáveis CSS direto no `style`, sem cast. */
declare module "react" {
  interface CSSProperties {
    [variable: CssVariable]: string | number | undefined;
  }
}
