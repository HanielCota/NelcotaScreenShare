import { PROFILE_PHOTO, profilePhotoSchema } from "@/features/account/domain/profile-photo";

/** Crops the image to a centered square and compresses it to the format the server accepts. */
export async function preparePhoto(file: File): Promise<string> {
  if (!PROFILE_PHOTO.mimeTypes.includes(file.type))
    throw new Error("Escolha uma imagem JPG, PNG ou WebP.");
  if (file.size > PROFILE_PHOTO.maxFileBytes) throw new Error("Escolha uma imagem de até 5 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = PROFILE_PHOTO.size;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não foi possível preparar a imagem. Tente novamente.");
    const side = Math.min(bitmap.width, bitmap.height);
    context.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    const result = profilePhotoSchema.safeParse(canvas.toDataURL("image/webp", 0.85));
    if (!result.success || result.data === null)
      throw new Error("Não foi possível preparar a imagem. Escolha outra foto.");
    return result.data;
  } finally {
    bitmap.close();
  }
}

/** Message shown when `preparePhoto` fails (an undecodable file throws a DOMException). */
export function photoErrorMessage(failure: unknown): string {
  if (failure instanceof DOMException)
    return "Não foi possível abrir a imagem. Escolha outra foto.";
  if (failure instanceof Error) return failure.message;
  return "Não foi possível abrir a imagem.";
}
