type Kind = "entradas" | "saidas" | "diarios" | "economias" | "cartao";

export type TotalsData = {
  totals: Record<Kind, number>;
  diaryDays: number;
  remainingDays: number;
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const badge: Record<Kind, string> = {
  entradas: "bg-positive text-positive-foreground",
  saidas: "bg-negative text-negative-foreground",
  diarios: "bg-chart-4 text-primary-foreground",
  economias: "bg-primary text-primary-foreground",
  cartao: "bg-chart-1 text-primary-foreground",
};

const LIST: { key: Kind; title: string }[] = [
  { key: "entradas", title: "entradas" },
  { key: "saidas", title: "saídas" },
  { key: "diarios", title: "diários" },
  { key: "economias", title: "economias" },
  { key: "cartao", title: "gastos com cartão" },
];

function Dot({ k }: { k: Kind }) {
  return (
    <span
      aria-hidden
      className={`grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${badge[k]}`}
    >
      {LIST.find((l) => l.key === k)!.title.charAt(0).toUpperCase()}
    </span>
  );
}

function Card({
  title,
  formula,
  value,
  hint,
  tone = "text-foreground",
}: {
  title: string;
  formula: React.ReactNode;
  value: string;
  hint: string;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        {formula}
      </div>
      <p className={`mt-4 font-display text-3xl font-bold tabular-nums ${tone}`}>{value}</p>
      <p className="mt-3 text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

export function TotalsBoard({ data }: { data: TotalsData }) {
  const { totals, diaryDays, remainingDays } = data;

  const custoVida = totals.saidas + totals.diarios + totals.cartao;
  // economias é independente: não entra na performance
  const performance = totals.entradas - custoVida;
  const economizado = totals.entradas > 0 ? (totals.economias / totals.entradas) * 100 : 0;
  const diarioMedio = diaryDays > 0 ? totals.diarios / diaryDays : 0;
  const previsao = diarioMedio * remainingDays;

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <p className="mb-3 text-sm text-muted-foreground">cálculos do mês</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card
            title="performance"
            formula={
              <>
                <Dot k="entradas" />－<Dot k="saidas" />－<Dot k="diarios" />－
                <Dot k="cartao" />
              </>
            }
            value={brl(performance)}
            hint={performance === 0 ? "zerado" : performance > 0 ? "sobrando" : "no vermelho"}
            tone={
              performance === 0
                ? "text-foreground"
                : performance > 0
                  ? "text-positive"
                  : "text-negative"
            }
          />
          <Card
            title="economizado"
            formula={
              <>
                <Dot k="economias" />
                <span className="h-2 w-24 rounded-full bg-positive/25" />
                <Dot k="entradas" />
              </>
            }
            value={`${economizado.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`}
            hint={economizado > 0 ? "guardado das entradas" : "nada guardado"}
          />
          <Card
            title="custo de vida"
            formula={
              <>
                <Dot k="saidas" />＋<Dot k="diarios" />＋<Dot k="cartao" />
              </>
            }
            value={brl(custoVida)}
            hint={custoVida === 0 ? "zerado" : "somatório dos gastos do mês"}
          />
          <Card
            title="diário médio"
            formula={
              <>
                <Dot k="diarios" />
                <span>/ {diaryDays || 0}</span>
              </>
            }
            value={brl(diarioMedio)}
            hint={`diários lançados: ${brl(totals.diarios)}`}
          />
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm text-muted-foreground">movimentações do mês</p>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="divide-y divide-border">
            {LIST.map((l) => (
              <div key={l.key} className="flex items-center gap-3 px-4 py-4">
                <Dot k={l.key} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {l.title}
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                  {brl(totals[l.key])}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm text-muted-foreground">previsão de diários do mês</p>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4">
          <Dot k="diarios" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
            previsão de diário{" "}
            <span className="text-muted-foreground">x {remainingDays}</span>
          </span>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
            {brl(previsao)}
          </span>
        </div>
      </div>
    </section>
  );
}
