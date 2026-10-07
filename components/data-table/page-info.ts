/** Paginação da tabela: cursores keyset e o total (até o limite de contagem). */
export interface PageInfo {
  nextCursor: string | null;
  prevCursor: string | null;
  total: number;
  /** O total passou do limite de contagem ("mais de 10.000"). */
  capped: boolean;
}

/** Só o que a tabela precisa da página (sem repetir as linhas no payload do cliente). */
export function pageInfo({ nextCursor, prevCursor, total, capped }: PageInfo): PageInfo {
  return { nextCursor, prevCursor, total, capped };
}
