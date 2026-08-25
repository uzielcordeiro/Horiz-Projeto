type Status = "positive" | "warning" | "negative";

export type HorizonDay = {
  day: number;
  date: string;
  balance: number;
  status: Status;
};

export type HorizonMonth = {
  y: number;
  m: number;
  label: string;
  days: HorizonDay[];
};

const cell: Record<Status, string> = {
  positive: "bg-positive/20 text-positive",
  warning: "bg-warning/25 text-warning-foreground",
  negative: "bg-negative/20 text-negative",
};

const compact = (v: number) => {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1000)
    return `${sign}${(abs / 1000).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}K`;
  return `${sign}${abs.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

type Props = {
  months: HorizonMonth[];
  onShift: (delta: number) => void;
  onPick: (y: number, m: number, day: number) => void;
  rangeLabel: string;
  todayIso: string;
};

export function HorizonBoard({ months, onShift, onPick, rangeLabel, todayIso }: Props) {
  const nav =
    "grid size-9 shrink-0 place-items-center rounded-full border border-border text-foreground transition-colors hover:bg-accent";
  const maxDays = Math.max(...months.map((mo) => mo.days.length), 31);

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

      <div className="rounded-2xl border border-border">
        <div className="max-h-[calc(100vh-160px)] overflow-auto rounded-2xl">
          <div className="flex min-w-max">
            {months.map((mo) => (
              <div key={`${mo.y}-${mo.m}`} className="w-40 shrink-0 border-r border-border last:border-r-0">
                <button
                  type="button"
                  onClick={() => onPick(mo.y, mo.m, 1)}
                  className="sticky top-0 z-10 block w-full border-b border-border bg-secondary px-3 py-2.5 text-center text-sm font-semibold text-foreground transition-colors hover:bg-accent"
                >
                  {mo.label}
                </button>
                <div className="divide-y divide-border">

                  {Array.from({ length: maxDays }, (_, i) => {
                    const d = mo.days[i];
                    if (!d)
                      return <div key={i} className="h-8 bg-muted/20" aria-hidden />;
                    const isToday = d.date === todayIso;
                    return (
                      <button
                        key={d.date}
                        type="button"
                        onClick={() => onPick(mo.y, mo.m, d.day)}
                        className={`grid h-8 w-full grid-cols-[34px_minmax(0,1fr)] items-center text-xs transition-opacity hover:opacity-80 ${cell[d.status]} ${
                          isToday ? "border-b-2 border-foreground" : ""
                        }`}
                      >
                        <span
                          className={`h-full grid place-items-center bg-background/60 tabular-nums ${
                            isToday ? "font-bold text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {d.day}
                        </span>
                        <span className="pr-2 text-right font-semibold tabular-nums">
                          {compact(d.balance)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        verde: saldo ≥ R$ 1.000 · amarelo: entre R$ 0 e R$ 1.000 · vermelho: negativo. clique em um
        dia para lançar nele.
      </p>
    </section>
  );
}
