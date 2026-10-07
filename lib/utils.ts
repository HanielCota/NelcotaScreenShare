export { cn } from "cn";

/** Reads a text field from a FormData (ignores files). */
export function formText(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
}
