import { Camera, Loader2 } from "lucide-react";
import { useId, useRef, useState } from "react";
import { FormError } from "@/components/FormError";
import { UserAvatar } from "@/components/UserAvatar";
import { photoErrorMessage, preparePhoto } from "@/features/account/client/prepare-photo";
import { PROFILE_PHOTO } from "@/features/account/domain/profile-photo";

/**
 * Optional photo at sign-up: the avatar opens the file picker. Without a photo, the
 * account keeps the default icon (it can be changed later on the account page).
 */
export function SignUpPhotoField({
  photo,
  onChange,
  disabled,
}: {
  photo: string | null;
  onChange: (photo: string | null) => void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const ids = { hint: useId(), error: useId() };
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string>();
  const busy = disabled || preparing;

  async function selectPhoto(file: File) {
    setPreparing(true);
    setError(undefined);
    try {
      onChange(await preparePhoto(file));
    } catch (failure) {
      setError(photoErrorMessage(failure));
    } finally {
      setPreparing(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label={photo ? "Trocar foto de perfil" : "Escolher foto de perfil"}
          aria-describedby={ids.hint}
          disabled={busy}
          onClick={() => input.current?.click()}
          className="group relative shrink-0 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-brand/60 disabled:opacity-60"
        >
          <UserAvatar image={photo} className="size-16" />
          <span className="absolute -right-0.5 -bottom-0.5 grid size-6 place-items-center rounded-full border-2 border-surface bg-surface-3 text-ink transition-colors group-hover:bg-brand group-hover:text-brand-ink">
            {preparing ? (
              <Loader2 className="size-3 animate-spin" aria-hidden="true" />
            ) : (
              <Camera className="size-3" aria-hidden="true" />
            )}
          </span>
        </button>
        <div className="flex min-w-0 flex-col gap-0.5 text-sm">
          <span className="font-medium">
            Foto de perfil <span className="font-normal text-ink-subtle">(opcional)</span>
          </span>
          <span id={ids.hint} className="text-xs text-ink-muted">
            JPG, PNG ou WebP, até 5 MB.{photo ? null : " Sem foto, usamos o ícone padrão."}
          </span>
          {photo ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                onChange(null);
                setError(undefined);
              }}
              className="self-start text-xs font-medium text-brand-soft hover:underline disabled:opacity-60"
            >
              Remover foto
            </button>
          ) : null}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept={PROFILE_PHOTO.mimeTypes.join(",")}
        // Outside the accessibility tree: the control is the avatar button.
        hidden
        disabled={busy}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) void selectPhoto(file);
        }}
      />
      <FormError id={ids.error} message={error} />
    </div>
  );
}
