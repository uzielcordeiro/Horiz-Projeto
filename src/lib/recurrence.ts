export type RecurrenceKind = "entradas" | "saidas" | "diarios" | "economias" | "cartao";

export type Recurrence = {
  id: string;
  kind: RecurrenceKind;
  name: string;
  label: string;
  tags?: string[];
  amount: number;
  freq: "monthly" | "weekly";
  daysOfMonth: number[];
  daysOfWeek: number[];
  startDate: string;
  installments: number | null;
  endDate?: string | null;
  skipped: string[];
};

export type Occurrence = {
  recurrenceId: string;
  kind: RecurrenceKind;
  date: string;
  amount: number;
  name: string;
  label: string;
  tags: string[];
  index: number;
  total: number | null;
};


const pad = (n: number) => String(n).padStart(2, "0");
export const isoOf = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const lastDay = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

function parseIso(s: string) {
  const parts = s.split("-").map(Number);
  return { y: parts[0] ?? 1970, m: (parts[1] ?? 1) - 1, d: parts[2] ?? 1 };
}

const MAX_OCCURRENCES = 6000;

/** All occurrences from startDate up to and including untilDate (ISO). */
export function occurrencesUntil(rec: Recurrence, untilDate: string): Occurrence[] {
  const start = parseIso(rec.startDate);
  const out: Occurrence[] = [];
  const total = rec.installments ?? null;
  let index = 0;

  const push = (date: string) => {
    if (date < rec.startDate) return false;
    if (rec.endDate && date > rec.endDate) return true; // encerrada

    index += 1;
    if (total != null && index > total) return true; // stop
    if (date <= untilDate && !rec.skipped.includes(date)) {
      out.push({
        recurrenceId: rec.id,
        date,
        amount: rec.amount,
        name: rec.name,
        label: rec.label,
        index,
        total,
      });
    }
    return false;
  };

  if (rec.freq === "monthly") {
    const days = [...new Set(rec.daysOfMonth)].sort((a, b) => a - b);
    if (days.length === 0) return out;
    let y = start.y;
    let m = start.m;
    while (index < MAX_OCCURRENCES) {
      const first = isoOf(y, m, 1);
      if (total == null && first > untilDate) break;
      for (const day of days) {
        const date = isoOf(y, m, Math.min(day, lastDay(y, m)));
        if (push(date)) return out;
      }
      if (total != null && index >= total) break;
      const next = new Date(y, m + 1, 1);
      y = next.getFullYear();
      m = next.getMonth();
      if (total == null && isoOf(y, m, 1) > untilDate) break;
    }
    return out;
  }

  const weekdays = [...new Set(rec.daysOfWeek)].sort((a, b) => a - b);
  if (weekdays.length === 0) return out;
  const cursor = new Date(start.y, start.m, start.d);
  cursor.setDate(cursor.getDate() - cursor.getDay()); // start of week (sunday)
  while (index < MAX_OCCURRENCES) {
    const weekStart = isoOf(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
    if (total == null && weekStart > untilDate) break;
    for (const wd of weekdays) {
      const d = new Date(cursor);
      d.setDate(d.getDate() + wd);
      if (push(isoOf(d.getFullYear(), d.getMonth(), d.getDate()))) return out;
    }
    if (total != null && index >= total) break;
    cursor.setDate(cursor.getDate() + 7);
  }
  return out;
}

/** Occurrences inside a given month (0-indexed month). */
export function occurrencesInMonth(rec: Recurrence, y: number, m: number): Occurrence[] {
  const end = isoOf(y, m, lastDay(y, m));
  const first = isoOf(y, m, 1);
  return occurrencesUntil(rec, end).filter((o) => o.date >= first);
}

/** Sum of occurrences strictly before a date (used for the opening balance). */
export function sumBefore(rec: Recurrence, date: string): number {
  return occurrencesUntil(rec, date)
    .filter((o) => o.date < date)
    .reduce((s, o) => s + o.amount, 0);
}

export const WEEKDAYS = [
  { value: 0, short: "dom" },
  { value: 1, short: "seg" },
  { value: 2, short: "ter" },
  { value: 3, short: "qua" },
  { value: 4, short: "qui" },
  { value: 5, short: "sex" },
  { value: 6, short: "sáb" },
];
