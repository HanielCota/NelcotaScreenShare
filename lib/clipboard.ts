import { toast } from "sonner";
import { logBrowserWarning } from "@/lib/telemetry.client";

type CopyMessages = {
  /** Console context when the browser refuses the clipboard. */
  context: string;
  success?: string;
  failure?: string;
};

/**
 * Copies `text`, toasting the given messages. A refused clipboard (permission, insecure
 * context) is expected, so it is only logged. Returns whether the copy worked.
 */
export async function copyText(text: string, messages: CopyMessages): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    logBrowserWarning(messages.context, error);
    if (messages.failure) toast.error(messages.failure);
    return false;
  }
  if (messages.success) toast.success(messages.success);
  return true;
}
