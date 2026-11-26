import { Reservation } from "../types";

// Mesmo limite aplicado pelo backend.
const MAX_SERIES_MONTHS = 6;

// Junta as datas de uma mesma reserva recorrente em um grupo, em ordem de
// data. Cada reserva única vira um grupo de um item só. A ordem dos grupos
// segue a da lista recebida.
export function groupBySeries(reservations: Reservation[]): Reservation[][] {
  const groups = new Map<string, Reservation[]>();

  for (const reservation of reservations) {
    const key = reservation.series_id ? `serie-${reservation.series_id}` : `reserva-${reservation.id}`;
    const group = groups.get(key);
    if (group) {
      group.push(reservation);
    } else {
      groups.set(key, [reservation]);
    }
  }

  return Array.from(groups.values(), (group) => group.sort((a, b) => a.date.localeCompare(b.date)));
}

export function describeWeekday(date: string): string {
  const day = new Date(date + "T12:00:00");
  const name = day.toLocaleDateString("pt-BR", { weekday: "long" });
  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
  return `${isWeekend ? "Todo" : "Toda"} ${name}`;
}

export function formatDateCount(count: number): string {
  return count === 1 ? "1 data" : `${count} datas`;
}

// Recebe as datas de um grupo já em ordem.
export function describePeriod(occurrences: Reservation[]): string {
  const first = occurrences[0].date;
  const last = occurrences[occurrences.length - 1].date;
  const period = first === last ? first : `${first} a ${last}`;
  return `${period} (${formatDateCount(occurrences.length)})`;
}

export function countWeeklyDates(startDate: string, endDate: string): number {
  const difference = Date.parse(endDate + "T12:00:00") - Date.parse(startDate + "T12:00:00");
  const days = Math.round(difference / (24 * 60 * 60 * 1000));
  return days < 0 ? 0 : Math.floor(days / 7) + 1;
}

// Última data que o campo "Repetir até" aceita.
export function maxSeriesEndDate(startDate: string): string {
  const [year, month, day] = startDate.split("-").map(Number);
  const targetMonth = month - 1 + MAX_SERIES_MONTHS;
  const lastDayOfTarget = new Date(year, targetMonth + 1, 0).getDate();
  const limit = new Date(year, targetMonth, Math.min(day, lastDayOfTarget));

  const limitMonth = String(limit.getMonth() + 1).padStart(2, "0");
  const limitDay = String(limit.getDate()).padStart(2, "0");
  return `${limit.getFullYear()}-${limitMonth}-${limitDay}`;
}

export function isCancellable(reservation: Reservation): boolean {
  return ["pendente", "aprovada", "espera"].includes(reservation.status);
}

// Ainda não terminou, no horário local de quem está usando o sistema.
export function isUpcoming(reservation: Reservation): boolean {
  return new Date(`${reservation.date}T${reservation.end_time}:00`) > new Date();
}
