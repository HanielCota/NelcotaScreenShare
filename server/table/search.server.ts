import { sql, type SQL } from "drizzle-orm";

/** Escapes \ % and _ to use the text in a literal LIKE. */
export function likeEscape(text: string): string {
  return text.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

/** "Contains" search term, accent- and case-insensitive (matches the trigram indexes). */
export function unaccentLike(expression: SQL, term: string): SQL {
  return sql`f_unaccent(lower(${expression})) like '%' || f_unaccent(lower(${likeEscape(term)})) || '%'`;
}
