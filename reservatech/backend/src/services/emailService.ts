import nodemailer from "nodemailer";
import db from "../database/db";

const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

const subjects: Record<string, string> = {
  aprovada: "Sua reserva foi aprovada",
  recusada: "Sua reserva foi recusada",
  cancelada: "Sua reserva foi cancelada",
  espera: "Você entrou na fila de espera",
  pendente: "Sua reserva saiu da fila de espera e agora está pendente",
};

function formatDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

const seriesStatusLabels: Record<string, string> = {
  pendente: "Pendentes de aprovação",
  aprovada: "Aprovadas",
  recusada: "Recusadas",
  cancelada: "Canceladas",
  espera: "Na fila de espera",
};

// Um único e-mail para a reserva recorrente, em vez de um por data.
export async function notifySeries(reservationIds: number[], subject: string, skippedDates: string[] = []) {
  if (!transporter || reservationIds.length === 0) return;

  try {
    const placeholders = reservationIds.map(() => "?").join(", ");
    const rows = db
      .prepare(
        `SELECT reservations.date, reservations.start_time, reservations.end_time,
                reservations.status, reservations.reason,
                users.name AS user_name, users.email AS user_email,
                resources.name AS resource_name
         FROM reservations
         JOIN users ON users.id = reservations.user_id
         JOIN resources ON resources.id = reservations.resource_id
         WHERE reservations.id IN (${placeholders})
         ORDER BY reservations.date`
      )
      .all(...reservationIds) as any[];

    if (rows.length === 0) return;
    const [first] = rows;

    let text =
      `Olá, ${first.user_name}!\n\n` +
      `Sua reserva recorrente de ${first.resource_name}, ` +
      `das ${first.start_time} às ${first.end_time}:\n`;

    for (const [status, label] of Object.entries(seriesStatusLabels)) {
      const dates = rows.filter((r) => r.status === status).map((r) => formatDate(r.date));
      if (dates.length > 0) {
        text += `\n${label}: ${dates.join(", ")}`;
      }
    }

    if (skippedDates.length > 0) {
      text += `\nNão reservadas por manutenção: ${skippedDates.map(formatDate).join(", ")}`;
    }

    if (first.reason) {
      text += `\n\nMotivo: ${first.reason}`;
    }

    text += "\n\nEquipe ReservaTech";

    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: first.user_email,
      subject,
      text,
    });
  } catch (error) {
    console.error("Não foi possível enviar o e-mail da reserva recorrente:", error);
  }
}

export async function notifyRequester(reservationId: number | bigint | string) {
  if (!transporter) return;

  try {
    const info = db
      .prepare(
        `SELECT reservations.date, reservations.start_time, reservations.end_time,
                reservations.status, reservations.reason,
                users.name AS user_name, users.email AS user_email,
                resources.name AS resource_name
         FROM reservations
         JOIN users ON users.id = reservations.user_id
         JOIN resources ON resources.id = reservations.resource_id
         WHERE reservations.id = ?`
      )
      .get(reservationId) as any;

    if (!info || !subjects[info.status]) return;

    let text =
      `Olá, ${info.user_name}!

` +
      `Sua reserva de ${info.resource_name} no dia ${formatDate(info.date)}, ` +
      `das ${info.start_time} às ${info.end_time}, `;

    if (info.status === 'espera') {
      text += `entrou na fila de espera devido a conflito de horário. Você será avisado caso o horário seja liberado.`;
    } else if (info.status === 'pendente') {
      text += `saiu da fila de espera e agora está pendente para aprovação do administrador.`;
    } else {
      text += `foi ${info.status}.`;
    }

    if (info.reason) {
      text += `

Motivo: ${info.reason}`;
    }

    text += "\n\nEquipe ReservaTech";

    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: info.user_email,
      subject: subjects[info.status],
      text,
    });
  } catch (error) {
    console.error("Não foi possível enviar o e-mail da reserva:", error);
  }
}
