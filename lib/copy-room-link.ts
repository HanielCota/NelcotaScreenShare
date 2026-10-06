import { toast } from "sonner";
import { roomPath } from "@/lib/livekit";

export async function copyRoomLink(code: string): Promise<void> {
  const url = `${window.location.origin}${roomPath(code)}`;
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Link da sala copiado!");
  } catch {
    toast.error(`Não foi possível copiar. Link: ${url}`);
  }
}
