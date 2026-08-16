import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Saldos — Linha do Tempo Financeira" },
      {
        name: "description",
        content:
          "Agenda financeira dia a dia: registre entradas e acompanhe o saldo da sua linha temporal mês a mês.",
      },
      { property: "og:title", content: "Saldos — Linha do Tempo Financeira" },
      {
        property: "og:description",
        content:
          "Agenda financeira dia a dia: registre entradas e acompanhe o saldo da sua linha temporal mês a mês.",
      },
    ],
  }),
  component: Index,
});

type Entry = { id: string; amount: number; date: string; label: string };

const STORAGE_KEY = "timeline-entries-v1";
const LABELS = ["Salário", "Freela", "Diária", "Trabalho extra", "Outro"];

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const monthLabel = (y: number, m: number) =>
  new Date(y, m, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

type Status = "positive" | "warning" | "negative";
const statusOf = (b: number): Status => (b >= 1000 ? "positive" : b > 0 ? "warning" : "negative");
const saldoCell: Record<Status, string> = {
  positive: "bg-positive/15 text-positive",
  warning: "bg-warning/20 text-warning-foreground",
  negative: "bg-negative/15 text-negative",
};
const dotClass: Record<Status, string> = {
  positive: "bg-positive",
  warning: "bg-warning",
  negative: "bg-negative",
};

function parseAmount(input: string) {
  const n = Number(input.replace(/\s|R\$/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

function Index() {
  const today = new Date();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState<string>(LABELS[0] ?? "Salário");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setEntries(JSON.parse(raw) as Entry[]);
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries, loaded]);

  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();

  const rows = useMemo(() => {
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    const openingDate = iso(cursor.y, cursor.m, 1);
    let running = sorted
      .filter((e) => e.date < openingDate)
      .reduce((sum, e) => sum + e.amount, 0);
    const opening = running;

    const list = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const date = iso(cursor.y, cursor.m, day);
      const dayEntries = sorted.filter((e) => e.date === date);
      const entradas = dayEntries.reduce((sum, e) => sum + e.amount, 0);
      running += entradas;
      return { day, date, entradas, balance: running, entries: dayEntries };
    });

    return { list, opening, closing: running };
  }, [entries, cursor, daysInMonth]);

  const monthTotal = rows.list.reduce((s, r) => s + r.entradas, 0);
  const closingStatus = statusOf(rows.closing);

  function shiftMonth(delta: number) {
    setSelectedDay(null);
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  function saveEntry(e: React.FormEvent) {
    e.preventDefault();
    if (selectedDay == null) return;
    const value = parseAmount(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Informe um valor maior que zero.");
      return;
    }
    setError(null);
    setEntries((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        amount: value,
        date: iso(cursor.y, cursor.m, selectedDay),
        label: label.trim() || "Outro",
      },
    ]);
    setAmount("");
    setSelectedDay(null);
  }

  const isToday = (day: number) =>
    cursor.y === today.getFullYear() && cursor.m === today.getMonth() && day === today.getDate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto grid w-full max-w-4xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 sm:flex sm:justify-between sm:px-8">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              linha do tempo
            </p>
            <h1 className="truncate text-xl font-semibold text-foreground sm:text-2xl">saldos</h1>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => shiftMonth(-1)}
              aria-label="Mês anterior"
              className="grid size-9 place-items-center rounded-full border border-border text-foreground transition-colors hover:bg-accent"
            >
              ‹
            </button>
            <span className="min-w-40 text-center text-sm font-medium capitalize text-foreground">
              {monthLabel(cursor.y, cursor.m)}
            </span>
            <button
              onClick={() => shiftMonth(1)}
              aria-label="Próximo mês"
              className="grid size-9 place-items-center rounded-full border border-border text-foreground transition-colors hover:bg-accent"
            >
              ›
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl space-y-6 px-5 py-8 sm:px-8">
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">saldo anterior</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{brl(rows.opening)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">entradas do mês</p>
            <p className="mt-1 text-lg font-semibold text-positive">{brl(monthTotal)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">saldo final</p>
            <p className={`mt-1 flex items-center gap-2 text-lg font-semibold ${saldoCell[closingStatus].split(" ")[1]}`}>
              <span className={`size-2.5 rounded-full ${dotClass[closingStatus]}`} />
              {brl(rows.closing)}
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="grid grid-cols-[56px_minmax(0,1fr)_minmax(0,1fr)] items-center border-b border-border bg-secondary px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span>dia</span>
            <span className="text-right">entradas</span>
            <span className="text-right">saldos</span>
          </div>

          <div className="divide-y divide-border">
            {rows.list.map((row) => {
              const s = statusOf(row.balance);
              const open = selectedDay === row.day;
              return (
                <div key={row.date}>
                  <button
                    onClick={() => {
                      setError(null);
                      setSelectedDay(open ? null : row.day);
                    }}
                    className={`grid w-full grid-cols-[56px_minmax(0,1fr)_minmax(0,1fr)] items-center px-3 py-2.5 text-left transition-colors hover:bg-accent/50 ${
                      open ? "bg-accent/60" : ""
                    }`}
                  >
                    <span
                      className={`grid size-8 place-items-center rounded-lg text-sm font-semibold ${
                        isToday(row.day)
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {row.day}
                    </span>
                    <span
                      className={`truncate text-right text-sm tabular-nums ${
                        row.entradas > 0 ? "font-medium text-positive" : "text-muted-foreground/60"
                      }`}
                    >
                      {brl(row.entradas)}
                    </span>
                    <span
                      className={`ml-auto rounded-lg px-2.5 py-1 text-right text-sm font-semibold tabular-nums ${saldoCell[s]}`}
                    >
                      {brl(row.balance)}
                    </span>
                  </button>

                  {row.entries.length > 0 && (
                    <ul className="space-y-1 bg-secondary/40 px-3 pb-2.5 pt-0.5">
                      {row.entries.map((e) => (
                        <li
                          key={e.id}
                          className="flex items-center justify-between gap-3 pl-14 text-sm"
                        >
                          <span className="truncate text-muted-foreground">{e.label}</span>
                          <span className="shrink-0 tabular-nums text-positive">
                            + {brl(e.amount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {open && (
                    <form
                      onSubmit={saveEntry}
                      className="grid gap-3 border-t border-border bg-accent/30 p-4 sm:grid-cols-[1fr_1fr_auto]"
                    >
                      <label className="space-y-1.5">
                        <span className="text-xs font-medium text-muted-foreground">valor</span>
                        <input
                          autoFocus
                          inputMode="decimal"
                          maxLength={20}
                          value={amount}
                          onChange={(ev) => setAmount(ev.target.value)}
                          placeholder="2.000,00"
                          className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                        />
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-xs font-medium text-muted-foreground">
                          identificação
                        </span>
                        <input
                          list="labels"
                          maxLength={40}
                          value={label}
                          onChange={(ev) => setLabel(ev.target.value)}
                          placeholder="Salário"
                          className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                        />
                        <datalist id="labels">
                          {LABELS.map((l) => (
                            <option key={l} value={l} />
                          ))}
                        </datalist>
                      </label>
                      <button
                        type="submit"
                        className="h-10 self-end rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                      >
                        salvar entrada
                      </button>
                      {error && (
                        <span className="text-sm text-negative sm:col-span-3">{error}</span>
                      )}
                    </form>
                  )}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-[56px_minmax(0,1fr)_minmax(0,1fr)] items-center border-t border-border bg-secondary px-3 py-3 text-sm font-semibold">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">total</span>
            <span className="text-right tabular-nums text-positive">{brl(monthTotal)}</span>
            <span
              className={`ml-auto rounded-lg px-2.5 py-1 text-right tabular-nums ${saldoCell[closingStatus]}`}
            >
              {brl(rows.closing)}
            </span>
          </div>
        </section>

        <p className="text-center text-xs text-muted-foreground">
          toque em um dia para lançar uma entrada
        </p>
      </main>
    </div>
  );
}
