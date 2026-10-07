/** CSS variable name, e.g. `--mascot-saturation`. */
export type CssVariable = `--${string}`;

/** CSS variables directly in `style`, without a cast. */
declare module "react" {
  interface CSSProperties {
    [variable: CssVariable]: string | number | undefined;
  }
}
