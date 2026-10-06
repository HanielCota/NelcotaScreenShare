import { parseAsString, parseAsStringLiteral } from "nuqs/server";

/**
 * Parâmetros de URL comuns a toda tabela do painel (estado na URL: dá para
 * compartilhar o link e voltar no histórico). Cada feature soma os seus filtros.
 */
export const pageParsers = {
  cursor: parseAsString,
  dir: parseAsStringLiteral(["next", "prev"] as const).withDefault("next"),
  ordem: parseAsStringLiteral(["asc", "desc"] as const).withDefault("desc"),
};

/** Mudar filtro ou ordenação volta para a primeira página. */
export const resetPage = { cursor: null, dir: null } as const;

export const PAGE_SIZE = 50;
