type Status = "positive" | "warning" | "negative";

export type HorizonMonth = {
  y: number;
  m: number;
  label: string;
  totals: Record<string, number>;
  closing: number;
  status: Status;
};

const saldoCell: Record<Status, string> = {
  positive: "bg-positive/15 text-positive",
  warning: "bg-warning/20 text-warning-foreground",
  negative: "bg-negative/15 text-negative",
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Props = {
  months: HorizonMonth[];
  columns: { key: string; title: string }[];
  onShift: (delta: number) => void;
  onPick: (y: number, m: number) => void;
  rangeLabel: string;
};

export function HorizonBoard({ months, columns, onShift, onPick, rangeLabel }: Props) {
  const nav =
    "grid size-9 shrink-0 place-items-center rounded-full border border-border text-foreground transition-colors hover:bg-accent";
  const grid = `grid min-w-[760px] grid-cols-[110px_repeat(${columns.length},minmax(100px,1fr))_minmax(120px,1fr)]`;

  return (
    <section className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-display text-xl font-semibold text-foreground">
            horizonte de saldos
          </h2>
          <p className="truncate text-xs text-muted-foreground">{rangeLabel}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={() => onShift(-12)} aria-label="12 meses antes" className={nav}>
            «
          </button>
          <button onClick={() => onShift(-1)} aria-label="mês anterior" className={nav}>
            ‹
          </button>
          <button onClick={() => onShift(1)} aria-label="próximo mês" className={nav}>
            ›
          </button>
          <button onClick={() => onShift(12)} aria-label="12 meses depois" className={nav}>
            »
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border">
        <div className="overflow-x-auto">
          <div
            className={`${grid} items-center bg-secondary px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground`}
          >
            <span>mês</span>
            {columns.map((c) => (
              <span key={c.key} className="text-right">
                {c.title}
              </span>
            ))}
            <span className="text-right">saldo</span>
          </div>

          <div className="divide-y divide-border">
            {months.map((mo) => (
              <button
                key={`${mo.y}-${mo.m}`}
                type="button"
                onClick={() => onPick(mo.y, mo.m)}
                className={`${grid} w-full items-center px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent/40`}
              >
                <span className="truncate font-medium text-foreground">{mo.label}</span>
                {columns.map((c) => (
                  <span key={c.key} className="text-right tabular-nums text-muted-foreground">
                    {mo.totals[c.key] ? brl(mo.totals[c.key] ?? 0) : "—"}
                  </span>
                ))}
                <span
                  className={`rounded-lg px-2 py-1 text-right font-semibold tabular-nums ${saldoCell[mo.status]}`}
                >
                  {brl(mo.closing)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        clique em um mês para lançar direto nele.
      </p>
    </section>
  );
}
