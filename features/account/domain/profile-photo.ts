import { z } from "zod";

export const PROFILE_PHOTO = {
  size: 256,
  maxFileBytes: 5 * 1024 * 1024,
  maxDataLength: 180_000,
  mimeTypes: ["image/jpeg", "image/png", "image/webp"],
};

/** Só imagens raster compactas geradas pelo editor, ou null para remover. */
export const profilePhotoSchema = z
  .string()
  .max(PROFILE_PHOTO.maxDataLength)
  .regex(/^data:image\/webp;base64,UklGR[A-Za-z0-9+/]+={0,2}$/)
  .nullable();
