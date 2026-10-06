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

/** Período "de/até" em dias de São Paulo (AAAA-MM-DD), comum às tabelas do painel. */
export const periodParsers = {
  de: parseAsString,
  ate: parseAsString,
};

/** Mudar filtro ou ordenação volta para a primeira página. */
export const resetPage = { cursor: null, dir: null } as const;

export const PAGE_SIZE = 50;

/**
 * Alvo de uma ação em massa: IDs marcados na página (até 500) ou todos os
 * resultados do filtro atual (`busca` = query string da URL, sem a página),
 * que o servidor reaplica com limite de 10.000.
 */
export type BulkSelection = { tipo: "ids"; ids: string[] } | { tipo: "filtro"; busca: string };

export const BULK_IDS_LIMIT = 500;
export const BULK_FILTER_LIMIT = 10_000;

/** Query string do filtro, sem cursor de página. */
export function filterQuery(search: URLSearchParams | string): string {
  const params = new URLSearchParams(search);
  params.delete("cursor");
  params.delete("dir");
  params.sort();
  return params.toString();
}
