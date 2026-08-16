import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Linha do Tempo Financeira — Entradas" },
      {
        name: "description",
        content:
          "Registre suas entradas com valor, data e etiqueta e veja o saldo evoluir na sua linha do tempo financeira.",
      },
      { property: "og:title", content: "Linha do Tempo Financeira — Entradas" },
      {
        property: "og:description",
        content:
          "Registre suas entradas com valor, data e etiqueta e veja o saldo evoluir na sua linha do tempo financeira.",
      },
    ],
  }),
  component: Index,
});

type Entry = {
  id: string;
  amount: number;
  date: string; // yyyy-mm-dd
  label: string;
};

const STORAGE_KEY = "timeline-entries-v1";
const LABELS = ["Salário", "Freela", "Diária", "Trabalho extra", "Outro"];

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

type Status = "positive" | "warning" | "negative";

const statusOf = (balance: number): Status =>
  balance >= 1000 ? "positive" : balance > 0 ? "warning" : "negative";

const statusStyles: Record<Status, { dot: string; text: string; chip: string; label: string }> = {
  positive: {
    dot: "bg-positive",
    text: "text-positive",
    chip: "bg-positive text-positive-foreground",
    label: "Saldo confortável",
  },
  warning: {
    dot: "bg-warning",
    text: "text-warning",
    chip: "bg-warning text-warning-foreground",
    label: "Atenção",
  },
  negative: {
    dot: "bg-negative",
    text: "text-negative",
    chip: "bg-negative text-negative-foreground",
    label: "Saldo negativo",
  },
};

function parseAmount(input: string) {
  const normalized = input.replace(/\s|R\$/g, "").replace(/\./g, "").replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : NaN;
}

function Index() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [label, setLabel] = useState<string>(LABELS[0] ?? "Salário");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setEntries(JSON.parse(raw) as Entry[]);
    } catch {
      /* ignore */
    }
    const today = new Date();
    setDate(
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
        today.getDate(),
      ).padStart(2, "0")}`,
    );
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries, loaded]);

  const timeline = useMemo(() => {
    const sorted = [...entries].sort((a, b) =>
      a.date === b.date ? a.id.localeCompare(b.id) : a.date.localeCompare(b.date),
    );
    let running = 0;
    return sorted.map((entry) => {
      running += entry.amount;
      return { ...entry, balance: running };
    });
  }, [entries]);

  const total = timeline.length ? (timeline[timeline.length - 1]?.balance ?? 0) : 0;
  const status = statusStyles[statusOf(total)];

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const value = parseAmount(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Informe um valor maior que zero.");
      return;
    }
    if (!date) {
      setError("Informe a data da entrada.");
      return;
    }
    setError(null);
    setEntries((prev) => [
      ...prev,
      { id: crypto.randomUUID(), amount: value, date, label: label.trim() || "Outro" },
    ]);
    setAmount("");
  }

  return (
    <main className="min-h-screen bg-background px-5 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto w-full max-w-3xl space-y-8">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Linha do tempo financeira
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Entradas
          </h1>
        </header>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Saldo final da linha temporal</p>
              <p className={`mt-1 text-4xl font-semibold tracking-tight sm:text-5xl ${status.text}`}>
                {brl(total)}
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${status.chip}`}
            >
              <span className="size-2 rounded-full bg-current opacity-80" />
              {status.label}
            </span>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold text-foreground">Nova entrada</h2>
          <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-3">
            <label className="block space-y-1.5 sm:col-span-1">
              <span className="text-sm font-medium text-foreground">Valor</span>
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="2.000,00"
                maxLength={20}
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-foreground">Data</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-foreground">Identificação</span>
              <input
                list="labels"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={40}
                placeholder="Salário"
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-base text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
              <datalist id="labels">
                {LABELS.map((l) => (
                  <option key={l} value={l} />
                ))}
              </datalist>
            </label>
            <div className="sm:col-span-3 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="h-11 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Salvar entrada
              </button>
              {error && <span className="text-sm text-negative">{error}</span>}
            </div>
          </form>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Linha temporal</h2>
          {timeline.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Nenhuma entrada registrada ainda.
            </p>
          ) : (
            <ol className="space-y-3">
              {timeline.map((item) => {
                const s = statusStyles[statusOf(item.balance)];
                return (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-5"
                  >
                    <span className={`size-3 shrink-0 rounded-full ${s.dot}`} />
                    <div className="min-w-32 flex-1">
                      <p className="text-sm text-muted-foreground">{formatDate(item.date)}</p>
                      <p className="font-medium text-foreground">{item.label}</p>
                    </div>
                    <p className="text-base font-medium text-positive">+ {brl(item.amount)}</p>
                    <div className="w-full text-right sm:w-36">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Saldo</p>
                      <p className={`text-lg font-semibold ${s.text}`}>{brl(item.balance)}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </main>
  );
}
