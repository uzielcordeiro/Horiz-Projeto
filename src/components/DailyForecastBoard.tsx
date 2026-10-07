import { FitMoney } from "@/components/FitMoney";
import { formatMoneyInput } from "@/lib/money-input";
import { dailyBudgetAmount } from "@/lib/recurrence";
import { useMemo, useState } from "react";
import { AddWindow } from "@/components/AddWindow";

export type ForecastItem = {
  id: string;
  name: string;
  amount: number;
  period: "mensal" | "semanal";
  tags: string[];
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });


export function DailyForecastBoard({
  items,
  year,
  month,
  onSave,
  onDelete,
  onBack,
}: {
  items: ForecastItem[];
  year: number;
  month: number;
  onSave: (item: ForecastItem) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ForecastItem | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState<"mensal" | "semanal">("mensal");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const monthly = useMemo(
    () =>
      items.reduce(
        (s, i) => s + (i.period === "semanal" ? 0 : i.amount),
        0,
      ),
    [items],
  );
  const weekly = items.reduce((s, i) => s + (i.period === "semanal" ? i.amount : 0), 0);
  const divisor = new Date(year, month + 1, 0).getDate();
  const perDay = items.length > 0 ? dailyBudgetAmount(monthly, weekly, year, month) : 0;

  function openForm(item?: ForecastItem) {
    setEditing(item ?? null);
    setName(item?.name ?? "");
    setAmount(item ? item.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "");
    setPeriod(item?.period ?? "mensal");
    setTags(item?.tags ?? []);
    setTagInput("");
    setError(null);
    setOpen(true);
  }

  function addTag() {
    const t = tagInput.trim().replace(/^#/, "").toLowerCase();
    if (!t) return;
    setTags((prev) => (prev.includes(t) ? prev : [...prev, t]));
    setTagInput("");
  }

  function submit() {
    const value = Number(amount.replace(/\./g, "").replace(",", "."));
    if (!name.trim()) return setError("dê um nome pro gasto.");
    if (!Number.isFinite(value) || value <= 0) return setError("informe um valor maior que zero.");
    onSave({
      id: editing?.id ?? crypto.randomUUID(),
      name: name.trim(),
      amount: value,
      period,
      tags,
    });
    setOpen(false);
  }

  const field =
    "h-11 w-full rounded-xl border border-border bg-background px-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-ring";

  return (
    <section className="mx-auto w-full max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="voltar"
          className="grid size-9 shrink-0 place-items-center rounded-full border border-border text-foreground transition-colors hover:bg-accent"
        >
          ←
        </button>
        <h2 className="min-w-0 flex-1 truncate font-display text-lg font-semibold text-foreground">
          previsão gasto diário
        </h2>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <p className="min-w-0 truncate text-sm text-muted-foreground">gastos mensais</p>
        <button
          type="button"
          onClick={() => openForm()}
          aria-label="adicionar gasto"
          className="grid size-12 shrink-0 place-items-center rounded-full border-2 border-positive bg-positive text-xl text-positive-foreground shadow-sm transition-transform hover:scale-105 active:scale-95"
        >
          ＋
        </button>
      </div>



      {items.length === 0 ? (
        <div className="grid place-items-center gap-6 rounded-2xl border border-border bg-card px-6 py-16 text-center">
          <p className="text-base text-muted-foreground">
            adicione mercado, gasolina, remédio, lanches, apps de comida…
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="divide-y divide-border">
            {items.map((i) => (
              <div key={i.id} className="flex items-center gap-3 px-4 py-4">
                <button
                  type="button"
                  onClick={() => openForm(i)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate text-sm font-medium text-foreground">
                    {i.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {i.period}
                    {i.tags.length > 0 ? ` · ${i.tags.map((t) => `#${t}`).join(" ")}` : ""}
                  </span>
                </button>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                  <FitMoney value={i.amount} />
                </span>
                <button
                  type="button"
                  onClick={() => onDelete(i.id)}
                  aria-label={`apagar ${i.name}`}
                  className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3 rounded-2xl border border-border bg-card px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
            total mensal
          </span>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
            <FitMoney value={monthly + (weekly * divisor) / 7} />
          </span>
        </div>
        <div className="flex items-center gap-3 border-t border-border pt-3">
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
            dividido por
          </span>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
            {divisor} dias (dias do mês)
          </span>
        </div>
        <div className="flex items-center gap-3 border-t border-border pt-3">
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
            previsão por dia
          </span>
          <span className="shrink-0 font-display text-2xl font-bold tabular-nums text-foreground">
            <FitMoney value={perDay} />
          </span>
        </div>
      </div>

      {open && (
        <AddWindow
          title={editing ? "editar gasto" : "adicionar gasto"}
          subtitle="previsão gasto diário"
          onClose={() => setOpen(false)}
        >
          <div className="space-y-3">
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">nome</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="mercado, gasolina, lanches…"
                className={field}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">valor</span>
              <input
                value={amount}
                onChange={(e) => setAmount(formatMoneyInput(e.target.value))}
                inputMode="decimal"
                placeholder="450,00"
                className={field}
              />
            </label>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">período</span>
              <div className="grid grid-cols-2 gap-2">
                {(["mensal", "semanal"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    className={`h-11 rounded-xl border text-sm font-medium transition-colors ${
                      period === p
                        ? "border-transparent bg-accent text-accent-foreground"
                        : "border-border text-muted-foreground hover:bg-accent/60"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              {period === "semanal" && (
                <p className="text-xs text-muted-foreground">
                  itens semanais entram como valor ÷ 7 por dia.
                </p>
              )}
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">tags</span>
              <div className="flex gap-2">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="alimentação"
                  className={field}
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="h-11 shrink-0 rounded-xl border border-border px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  ＋
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {tags.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                      className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground"
                    >
                      #{t} ×
                    </button>
                  ))}
                </div>
              )}
            </div>

            {error && <p className="text-xs font-medium text-negative">{error}</p>}

            <button
              type="button"
              onClick={submit}
              className="h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              salvar
            </button>
          </div>
        </AddWindow>
      )}
    </section>
  );
}
