import { toast } from "sonner";

/** `onError` of an operation: the server message already comes ready for the admin. */
export function toastError(fallback: string) {
  return ({ error }: { error: { serverError?: string } }) =>
    void toast.error(error.serverError ?? fallback);
}
