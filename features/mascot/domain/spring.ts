/** Passo máximo da simulação: estável mesmo quando o navegador limita a 30 quadros por segundo. */
const MAX_STEP = 1 / 120;

/**
 * Avança uma mola criticamente amortecida (sem quique) por chave; diz se tudo já assentou.
 * `response` é o tempo de resposta em segundos, como nas molas da Apple (pode variar por chave).
 *
 * O intervalo do quadro é dividido em passos pequenos: com um passo só, molas rápidas (como a do
 * olhar) ficam instáveis abaixo de ~38 quadros por segundo e os valores explodem.
 */
export function springStep<K extends string>(
  value: Record<K, number>,
  velocity: Record<K, number>,
  target: Readonly<Record<K, number>>,
  response: number | ((key: K) => number),
  dt: number,
): boolean {
  let settled = true;
  for (const key in target) {
    const omega = (2 * Math.PI) / (typeof response === "number" ? response : response(key));
    for (let remaining = dt; remaining > 0; remaining -= MAX_STEP) {
      const h = Math.min(remaining, MAX_STEP);
      const acceleration = -omega * omega * (value[key] - target[key]) - 2 * omega * velocity[key];
      velocity[key] += acceleration * h;
      value[key] += velocity[key] * h;
    }
    // Rede de segurança: um valor inválido nunca chega ao desenho; volta pro alvo.
    if (!Number.isFinite(value[key]) || !Number.isFinite(velocity[key])) {
      value[key] = target[key];
      velocity[key] = 0;
    }
    if (Math.abs(value[key] - target[key]) > 0.002 || Math.abs(velocity[key]) > 0.01) {
      settled = false;
    }
  }
  return settled;
}
