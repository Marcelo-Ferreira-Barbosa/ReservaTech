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

/**
 * Data de hoje no formato "YYYY-MM-DD", usando o fuso horário LOCAL
 * da máquina onde o servidor roda.
 *
 * Usamos o horário local (e não UTC / toISOString()) de propósito:
 * as datas digitadas pelo usuário no frontend são datas locais, então
 * comparar com UTC faria a virada do dia acontecer na hora errada
 * (no Brasil, 3 horas antes da meia-noite real).
 */
export function todayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Hora atual no formato "HH:MM" (24h), também no fuso local.
 */
export function currentTimeHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

/**
 * Diz se um par data + horário final já ficou no passado.
 *
 * REGRA ADOTADA: o que impede a reserva é o horário de TÉRMINO já ter
 * passado. Ou seja, não dá para reservar um período que já acabou, mas
 * ainda é possível reservar um período que está em andamento agora
 * (ex: às 15:00, reservar das 14:00 às 16:00). Escolhemos assim porque
 * é a regra menos restritiva que ainda barra o caso que realmente não
 * faz sentido: reservar ontem.
 */
export function isInThePast(date: string, endTime: string): boolean {
  const today = todayISO();
  if (date < today) return true;
  if (date > today) return false;
  return endTime <= currentTimeHHMM();
}
