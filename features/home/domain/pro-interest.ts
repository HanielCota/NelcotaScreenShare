import { z } from "zod";

/** Body of POST /api/pro/interesse, the same in the browser and on the server. */
export const proInterestSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, "Esse e-mail é longo demais.")
    .pipe(z.email("Confira o e-mail: algo como nome@empresa.com.")),
});

export const proInterestResultSchema = z.object({ message: z.string() });
