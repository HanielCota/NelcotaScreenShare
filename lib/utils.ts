export { cn } from "cn";

/** Lê um campo de texto de um FormData (ignora arquivos). */
export function formText(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
}
