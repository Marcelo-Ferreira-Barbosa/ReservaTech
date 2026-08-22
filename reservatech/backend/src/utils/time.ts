/**
 * Verifica se dois intervalos de horário no MESMO DIA se sobrepõem.
 *
 * REGRA ADOTADA (documentada também em schema.sql e em
 * docs/DECISOES_TECNICAS.md): o horário final é um limite NÃO
 * inclusivo. Ou seja, o intervalo [start, end) inclui o início mas
 * não inclui o fim.
 *
 * Isso significa que uma reserva das 14:00-16:00 NÃO conflita com
 * uma reserva das 16:00-17:00, porque uma termina exatamente quando
 * a outra começa.
 *
 * Fórmula clássica de sobreposição de intervalos:
 *   existe conflito se (inicioA < fimB) E (inicioB < fimA)
 *
 * Os horários são comparados como strings "HH:MM" porque esse
 * formato, com zero à esquerda, ordena corretamente como texto
 * (ex: "09:00" < "10:00"). Isso evita ter que converter para Date.
 */
export function timeRangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return startA < endB && startB < endA;
}

/**
 * Validação simples de formato "HH:MM" (24h).
 */
export function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/**
 * Validação simples de formato "YYYY-MM-DD".
 */
export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00");
  return !Number.isNaN(date.getTime());
}

/**
 * Garante que o horário final seja estritamente depois do inicial.
 */
export function isEndAfterStart(start: string, end: string): boolean {
  return start < end;
}
