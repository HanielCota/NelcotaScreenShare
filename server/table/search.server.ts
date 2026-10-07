import { sql, type SQL } from "drizzle-orm";

/** Escapa \ % e _ para usar o texto num LIKE literal. */
export function likeEscape(text: string): string {
  return text.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

/** Termo de busca "contém", sem acento e sem caixa (casa com os índices trigram). */
export function unaccentLike(expression: SQL, term: string): SQL {
  return sql`f_unaccent(lower(${expression})) like '%' || f_unaccent(lower(${likeEscape(term)})) || '%'`;
}
